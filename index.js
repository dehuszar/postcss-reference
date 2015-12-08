var postcss = require('postcss');
var find = require('array-find');
var referenceableNodes = [];

module.exports = postcss.plugin('postcss-reference', function (opts) {
  opts = opts || {
    debug: false
  };

  var referenceRules = [];

  var testRelationExistsIn = function testSelectorExistsIn(ref, terms, prop) {
    var value = false;

    terms.forEach(function (term) {
      if (ref.indexOf(term[prop]) === 0) {
        value = true;
      }
    });

    return value;
  };

  var objectExistsInArray = function objectExistsInArray(array, param, test) {
    var result = array.find(function (obj, index, array) {
      return obj[param] === test;
    });

    return Boolean(result);
  };

  var extractMatchingDecls = function extractMatchingDecls(matchArray, rule) {
    rule.walkDecls(function(decl) {
      matchArray.push(decl);
    });
  };

  var extractMatchingRelationships = function extractMatchingRelationships(matchArray, rule) {
    matchArray.push(rule);
  };

  var extractMatchingMqs = function extractMatchingMqs(destination, source, mq) {
    find(destination, function (item, index, array) {
      if (item.mediaQuery === mq) {
        extractMatchingRelationships(destination[index].nodes, source);
      }
    });
  };

  var createMatchingMq = function createMatchingMq(destination, source, mq) {
    var newObj = {};
    newObj.mediaQuery = mq;
    newObj.nodes = [];
    destination.push(newObj);
    extractMatchingRelationships(destination[destination.length - 1].nodes, source);
  };

  var findDuplicates = function findDuplicates(matchArray, node, childParam) {
    var dup = null,
        matchRaws = "",
        nodeRaws = "";

    // Raws handling is to ensure CSS hacks like *width don't get stripped out and
    // override indended default declaration
    find(matchArray, function(match, index, array) {
      if (childParam === "prop") {
        if (match.raws && match.raws.before) {
          matchRaws = match.raws.before.trim();
        }
        if (node.raws && node.raws.before) {
          nodeRaws = node.raws.before.trim();
        }
      }

      if (matchRaws + match[childParam] === nodeRaws + node[childParam]) {
        dup = index;
      }
    });

    return dup;
  };

  var remapSelector = function remapSelectors(refSelector, reqSelector, term) {
      refSelector = refSelector.replace(term, reqSelector);
      return refSelector;
  };

  var prependRaws = function prependRaws(source) {
    for (var d = 0; d < source.length; d++) {
      if (source[d].raws.before) {
        source[d].prop = source[d].raws.before.trim() + source[d].prop;
      }
    }
  };

// borrowed from jonathantneal's clone gist :: https://gist.github.com/jonathantneal/e27c16ba19a3941ac95b
  var cloneReference = function cloneReference(node, deep, keepParent) {
  	if (typeof node !== 'object') return node;

  	var cloned = new node.constructor();

  	Object.keys(node).forEach(function (key) {
  		var value = node[key];

  		if (keepParent && key === 'parent' || key === 'source') cloned[key] = value;
  		else if (value instanceof Array) cloned[key] = deep ? value.map(function (child) {
  			return cloneReference(child, true, true);
  		}) : [];
  		else cloned[key] = cloneReference(value, deep);
  	});

  	return cloned;
  };

  var findParentMqs = function findParentMqs(mqTestObj) {
    while (mqTestObj.parent.type !== "root") {
      if (mqTestObj.parent.type === "atrule" &&
          mqTestObj.parent.name === "media") {
            return mqTestObj.parent.params;
      } else {
        mqTestObj = mqTestObj.parent;
      }
    }
  };

  var matchReferences = function matchReferences(referenceRules, node) {
    var matches,
        terms,
        processedTerms = [],
        reqMq = findParentMqs(node) || null,
        mqsMatch = false;

    matches = {
        decls: [],
        relationships: [],
        mqRelationships: []
    };

    // extract our @references() contents and split selectors into an array
    terms = node.params.split(',');


    // terms and params are a string at this point.  Convert to an array of
    // well defined objects for cleaner processing
    terms.forEach(function(term) {
      var obj = {
          all: false,
          name: null
      };

      obj.all = (term.indexOf(" all") !== -1);
      // strip out any params from term now that flags are set
      // (only 'all' for now)
      term = term.replace(" all", '');

      // clean any whitespaces which might surround commas after param
      // extraction and assign the term to obj.name
      obj.name = term.trim();

      processedTerms.push(obj);
    });



    for (var ref = 0; ref < referenceRules.length; ref++) {
      var refMq = null,
          reference = referenceRules[ref],
          matchedSelectorList = [];

      if (reference.parent.type === "atrule" &&
          reference.parent.name === "media") {
            refMq = reference.parent.params;
      }

      mqsMatch = (reqMq === refMq);

      // Clone the reference rule so we can safely mutate it
      reference = cloneReference(reference, true, true);
      // Compare clonded reference rule selectors against the resquested terms
      // For each selector in reference.selectors that is not at least a relative match
      // splice it from the selectors array

      // If what's left in the rule.selectors array is greater than 1, and
      // each rule in the rule.selectors isn't an exact match to a term
      // from the terms list, it is a defacto relative match,
      // otherwise test for exact and relative string matching before
      // determining extraction path

      for (var sel = 0; sel < reference.selectors.length; sel++) {
        var selector = reference.selectors[sel];

        for (var term = 0; term < processedTerms.length; term++) {
          var termObj = processedTerms[term],
              safeChars = [" ", ".", "#", "+", "~", ">", ":", "["],
              matchedSelector = {
                  name: selector,
                  type: null,
                  remap: null
              };

          if (selector.indexOf(termObj.name) === 0) {
            if (selector === termObj.name) {
              matchedSelector.type = "exact";
            } else if (selector.length > termObj.name.length &&
              termObj.all &&
              safeChars.indexOf(selector.charAt(termObj.name.length)) !== -1) {
                matchedSelector.type = "relative";
                matchedSelector.term = termObj.name;
            }

            if (matchedSelector.type !== null) {
              matchedSelector.remap = remapSelector(matchedSelector.name, node.parent.selector, termObj.name);

              if (termObj.all) {
                matchedSelector.scope = "all";
              }

              matchedSelectorList.push(matchedSelector);
            }
          }
        }
      }

      if (matchedSelectorList.length > 0) {
        var matchedSelectorObj,
            joinedNames = matchedSelectorList.map(function(match) {
              return match.remap;
            }).join(', '),
            allExactMatches = matchedSelectorList.every(function(match) {
              return match.type === "exact";
            }),
            scopeAll = matchedSelectorList.some(function(match) {
              return match.scope === "all";
            });

        if (matchedSelectorList.length > 1) {
          matchedSelectorObj = {};

          if (joinedNames) {
            matchedSelectorObj.name = joinedNames;
          }

          if (scopeAll) {
            matchedSelectorObj.scope = scopeAll;
          }

          if (allExactMatches) {
            matchedSelectorObj.type = "exact";
          } else {
            matchedSelectorObj.type = "relative";
          }
        } else {
          matchedSelectorObj = matchedSelectorList[0];
          matchedSelectorObj.name = matchedSelectorObj.remap;
          delete matchedSelectorObj.remap;
        }

        reference.selector = matchedSelectorObj.name;

        if (mqsMatch) {
          if (matchedSelectorObj.type === "exact") {
            extractMatchingDecls(matches.decls, reference);
          } else {
            extractMatchingRelationships(matches.relationships, reference);
          }
        } else if (!mqsMatch && reqMq === null && matchedSelectorObj.scope === "all") {
          if (!matches.mqRelationships.length ||
              objectExistsInArray(matches.mqRelationships, "mediaQuery", refMq) === false) {
                createMatchingMq(matches.mqRelationships, reference, refMq);
          } else {
            extractMatchingMqs(matches.mqRelationships, reference, refMq);
          }
        }
      }
    }

    return matches;
  };

  var sortResults = function sortResults(array) {
    // invert array sorting order so rules are output in original order
    array.sort(function (a, b) {
      return 1;
    });
  };

  var removeComments = function removeComments(css) {
    css.walkComments(function (comment) {
      comment.remove();
    });
  };

  var findReferenceableRules = function findReferenceableRules(css) {
    // Walk through list of rules in @reference blocks, push them into the
    // referenceRules array and then remove them from the AST so they don't
    // get output to the compiled CSS unless matched.
    css.walkAtRules('reference', function(atRule) {
      atRule.walkRules(function(rule) {
        referenceRules.push(rule);
      });

      atRule.remove();
    });
  };

  var handlePseudoRefs = function handlePseudoRefs(rule) {
    // check for :references() pseudoclass
    var pseudoRef = ":references(",
        pseudoRefIndex = rule.selector.indexOf(pseudoRef),
        pseudoRefEnd = rule.selector.indexOf(")"),
        pseudoRefStr = "",
        newRef;

    if (pseudoRefIndex !== -1) {
      pseudoRefStr = rule.selector.slice(pseudoRefIndex + pseudoRef.length, pseudoRefEnd);
      newRef = postcss.atRule({
        name: 'references',
        params: pseudoRefStr
      });
      rule.prepend(newRef);
      rule.selector = rule.selector.slice(0, pseudoRefIndex);
    }
  };

  var findReferences = function findReferences(css) {
    // Now that our @reference blocks have been processed
    // Walk through our rules looking for @references declarations
    css.walkRules(function(rule) {
      handlePseudoRefs(rule);

      rule.walk(function(node) {

        if (node.type === 'atrule' &&
            node.name === 'references') {

          // check our reference array for any of our terms
          var matches = matchReferences(referenceRules, node);

          // if referenced and requesting rules have the same property
          // declarations, and the requesting rule's copy of the
          // declaraction comes after the @references request, defer
          // to the requesting rule's declaration
          rule.walkDecls(function(decl) {
            matches.decls.forEach(function(match, d, matchedDecls) {
              if (decl.prop === match.prop &&
                  rule.index(decl) > rule.index(node)) {
                    matchedDecls.splice(d, 1);
              }
            });
          });

          // walk through all matched declarations and make sure our raws are prepended
          prependRaws(matches.decls);
          for (var d = 0; d < matches.decls.length; d++) {
            rule.insertBefore(node, matches.decls[d]);
          }

          // loop through each decl in each matches.relationship and prepend raws
          for (var r = 0; r < matches.relationships.length; r++) {
            prependRaws(matches.relationships[r].nodes);
          }

          // sort results so they output in the original order referenced
          if (matches.mqRelationships.length && matches.mqRelationships.length > 1) {
            sortResults(matches.mqRelationships, "params");
          }

          for (var m = 0; m < matches.mqRelationships.length; m++) {
            var mq = matches.mqRelationships[m],
                targetAtRule;

            targetAtRule = postcss.atRule({
              name: "media",
              params: mq.mediaQuery
            });

            for (var n = 0; n < mq.nodes.length; n++) {
              var mqNode = mq.nodes[n];

              prependRaws(mqNode.nodes);
              targetAtRule.append(mqNode);
            }

            if (node.parent.type === 'rule') {
              css.insertAfter(node.parent, targetAtRule);
            } else {
              css.insertAfter(node, targetAtRule);
            }
          }

          // sort results so they output in the original order referenced
          if (matches.relationships.length && matches.relationships.length > 1) {
            sortResults(matches.relationships);
          }

          matches.relationships.forEach(function(newRule) {
            css.insertAfter(rule, newRule);
          });

          node.remove();
        }
      });
    });
  };

  return function (css, result) {
    removeComments(css);
    findReferenceableRules(css);
    findReferences(css);
  };
});
