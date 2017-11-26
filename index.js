/* jshint node: true */
"use strict";
var postcss = require('postcss');

module.exports = postcss.plugin('postcss-reference', function (opts) {
  opts = opts || {
    debug: false
  };

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
    return matchArray;
  };

  var extractMatchingRelationships = function extractMatchingRelationships(matchArray, rule) {
    matchArray.push(rule);
    return matchArray;
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

  const remapSelector = function remapSelectors(refSelector, reqSelector, term) {
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
  // can be deprecated when ready to support Node > v8
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

  var findParentSelector = function findParentSelector(testObj) {
    while (testObj.parent.type !== "root") {
      if (testObj.parent.type === "rule") {
            return testObj.parent.selector;
      } else {
        testObj = testObj.parent;
      }
    }
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

  var matchReferences = function matchReferences(referenceRules, node, targetMq) {
    var matches,
        terms,
        reqMq = findParentMqs(node) || null,
        reqSelector = findParentSelector(node),
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
    const processedTerms = terms.map(function(term) {
      /* assign flag existance as boolean on returned object and
       * strip out any params from term now that flags are set
       * (only 'all' for now) from the referencejstatement */
      return {
        all: (term.indexOf(" all") !== -1),
        name: term.replace(" all", '').trim()
      };
    });

   for (var ref = 0; ref < referenceRules.length; ref++) {
      var refMq = null,
          srcReference = referenceRules[ref],
          matchedSelectorList = [];

      if (srcReference.parent.type === "atrule" &&
          srcReference.parent.name === "media") {
            refMq = srcReference.parent.params;
      }

      mqsMatch = (reqMq === refMq) ||
                  targetMq === refMq ||
                  (targetMq === "" && refMq === null);

      // Clone the reference rule so we can safely mutate it
      const reference = cloneReference(srcReference, true, true);
      // Compare cloned reference rule selectors against the requested terms
      // For each selector in reference.selectors that is not at least a relative match
      // splice it from the selectors array

      // If what's left in the rule.selectors array is greater than 1, and
      // each rule in the rule.selectors isn't an exact match to a term
      // from the terms list, it is a defacto relative match,
      // otherwise test for exact and relative string matching before
      // determining extraction path

      matchedSelectorList = reference.selectors.filter(function(selector) {
        const terms = this;
        return terms.some(term => term.name === selector) ||
               terms.some(term => term.name !== selector &&
                 selector.indexOf(term.name) === 0 &&
                 selector.length > term.name &&
                 Boolean(term.all));
      }, processedTerms).map(function(selector) {
        const terms = this;
        const safeChars = [" ", ".", "#", "+", "~", ">", ":", "["];
        const obj = {
          name: selector,
          type: null,
          remap: null
        };
        const exactMatch = terms.find((term) => term.name === selector);
        const relativeMatch = terms.find((term) => {
          return term.name !== selector &&
                 selector.indexOf(term.name) === 0 &&
                 selector.length > term.name &&
                 Boolean(term.all);
        });
        const matchedItem = exactMatch || relativeMatch;
        if (Boolean(matchedItem)) {
          obj.remap = remapSelector(obj.name, reqSelector, matchedItem.name);
 
          if (matchedItem.all) {
            obj.scope = "all";
          }
          if (Boolean(exactMatch)) {
            obj.type = 'exact';
          } else if (Boolean(relativeMatch)) {
            obj.type = 'relative';
            obj.term = relativeMatch.name;
          }

          return Object.freeze(obj);
        }
      }, processedTerms);
/*       for (let i = 0; i < reference.selectors.length; i++) {
 *         let selector = reference.selectors[i];
 * 
 *         for (var term = 0; term < processedTerms.length; term++) {
 *           let termObj = processedTerms[term],
 *               safeChars = [" ", ".", "#", "+", "~", ">", ":", "["],
 *               matchedSelector = {
 *                   name: selector,
 *                   type: null,
 *                   remap: null
 *               };
 * 
 *           if (selector.indexOf(termObj.name) === 0) {
 *             if (selector === termObj.name) {
 *               matchedSelector.type = "exact";
 *             } else if (selector.length > termObj.name.length &&
 *               termObj.all &&
 *               safeChars.indexOf(selector.charAt(termObj.name.length)) !== -1) {
 *                 matchedSelector.type = "relative";
 *                 matchedSelector.term = termObj.name;
 *             }
 * 
 *             if (matchedSelector.type !== null) {
 *               matchedSelector.remap = remapSelector(matchedSelector.name, reqSelector, termObj.name);
 * 
 *               if (termObj.all) {
 *                 matchedSelector.scope = "all";
 *               }
 * 
 *               matchedSelectorList.push(matchedSelector);
 *             }
 *           }
 *         }
 *       } */

      if (matchedSelectorList.length > 0) {
        let matchedSelectorObj,
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
            matchedSelectorObj.scope = "all";
          }

          if (allExactMatches) {
            matchedSelectorObj.type = "exact";
          } else {
            matchedSelectorObj.type = "relative";
          }
        } else {
          matchedSelectorObj = Object.assign({}, matchedSelectorList[0]);
          if (Boolean(matchedSelectorObj) &&
              Boolean(matchedSelectorObj.remap)) {
            if (matchedSelectorObj.name !== matchedSelectorObj.remap) {
              matchedSelectorObj.name = matchedSelectorObj.remap;
              delete matchedSelectorObj.remap;
            }
          }
        }

        reference.selector = matchedSelectorObj.name;

        if (mqsMatch) {
          if (matchedSelectorObj.type === "exact") {
            matches.decls = extractMatchingDecls(matches.decls, reference);
          } else {
            matches.relationships = extractMatchingRelationships(matches.relationships, reference);
          }
        } else if (!mqsMatch && reqMq === null && matchedSelectorObj.scope === "all") {
          if (!matches.mqRelationships.length ||
              objectExistsInArray(matches.mqRelationships, "mediaQuery", refMq) === false) {
                matches.mqRelationships = createMatchingMq(matches.mqRelationships, reference, refMq);
          } else {
            matches.mqRelationships = extractMatchingMqs(matches.mqRelationships, reference, refMq);
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

  const findReferenceableRules = function findReferenceableRules(css) {

    let referenceRules = [];
    // Walk through list of rules in @reference blocks, push them into the
    // referenceRules array and then remove them from the AST so they don't
    // get output to the compiled CSS unless matched.
    css.walkAtRules('reference', function(atRule) {
      atRule.walkRules(function(rule) {
        referenceRules.push(rule);
      });

      atRule.remove();
    });
    
    return referenceRules;
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

    return rule;
  };

  var findReferences = function findReferences(css, referenceRules) {
    // Now that our @reference blocks have been processed
    // Walk through our rules looking for @references declarations
    css.walkRules(function(rule) {
      rule = handlePseudoRefs(rule);

      rule.walk(function(node) {

        if (node.type === 'atrule' &&
            node.name === 'references') {

          let requestingNode;
          let targetMq;

          if (node.parent.type === 'atrule' &&
              node.parent.name === 'references-media') {
                requestingNode = node.parent;
                targetMq = node.parent.params;
          } else {
            requestingNode = node;
          }

          // check our reference array for any of our terms
          var matches = matchReferences(referenceRules, node, targetMq);

          // if referenced and requesting rules have the same property
          // declarations, and the requesting rule's copy of the
          // declaraction comes after the @references request, defer
          // to the requesting rule's declaration
          rule.walkDecls(function(decl) {
            matches.decls.forEach(function(match, d, matchedDecls) {

              if (decl.prop === match.prop &&
                  rule.index(decl) > rule.index(requestingNode)) {
                    matchedDecls.splice(d, 1);
              } else if (decl.prop === match.prop &&
                  rule.index(decl) < rule.index(requestingNode)) {
                    decl.remove();
              }
            });
          });

          // walk through all matched declarations and make sure our raws are prepended
          prependRaws(matches.decls);
          /* for (var d = 0; d < matches.decls.length; d++) { */
          matches.decls.forEach(function(decl) {
            requestingNode.before(decl);
          });

          // loop through each decl in each matches.relationship and prepend raws
          /* for (var r = 0; r < matches.relationships.length; r++) { */
          matches.relationships.forEach(function(rel) {
            prependRaws(rel.nodes);
          });
          /* } */

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

            if (requestingNode.parent.type === 'rule') {
              css.insertAfter(requestingNode.parent, targetAtRule);
            } else {
              css.insertAfter(requestingNode, targetAtRule);
            }
          }

          // sort results so they output in the original order referenced
          if (matches.relationships.length && matches.relationships.length > 1) {
            sortResults(matches.relationships);
          }

          matches.relationships.forEach(function(newRule) {
            css.insertAfter(rule, newRule);
          });

          requestingNode.remove();
        }
      });
    });
  };

  return function (css, result) {
    removeComments(css);
    const referenceRules = findReferenceableRules(css);
    findReferences(css, referenceRules);
    result.css = css;
    return result;
  };
});
