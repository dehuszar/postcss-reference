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

    var extractMatchingDecls = function extractMatchingDecls(matchArray, rule) {

        rule.walkDecls(function(decl) {
            var dup = null;

            // check for duplicates in our list of matches
            dup = findDuplicates(matchArray, decl, "prop");

            if (dup !== null && decl.value.charAt(0) !== '-') {
                // if it's a dupe, replace existing rule
                matchArray[dup].replaceWith(decl);
            } else {
                // otherwise add to the declarations list
                matchArray.push(decl);
            }
        });
    };

    var extractMatchingRelationships = function extractMatchingRelationships(matchArray, rule) {

        if (!matchArray.length) {
            matchArray.push(rule);
        } else {
            matchArray.forEach(function(match) {
                var dup = null;

                dup = findDuplicates(matchArray, rule, "selector");

                if (dup !== null) {
                    // walk through each decl in rule and discard all matching decls
                    // from dup before merging remaining decls
                    extractMatchingDecls(matchArray[dup].nodes, rule);
                } else {
                    // otherwise add to the declarations list
                    matchArray.push(rule);
                }
            });
        }
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
        extractMatchingRelationships(destination[0].nodes, source);
    };

    var findDuplicates = function findDuplicates(matchArray, node, childParam) {
        var dup = null,
            matchRaws = "",
            nodeRaws = "";

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

    var matchReferences = function matchReferences(referenceRules, node) {
        var matches,
            terms,
            processedTerms = [],
            reqMq = null,
            mqTestObj = node,
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

        while (mqTestObj.parent.type !== "root") {
            if (mqTestObj.parent.type === "atrule" &&
                mqTestObj.parent.name === "media") {
                    reqMq = mqTestObj.parent.params;
                    break;
            } else {
                mqTestObj = mqTestObj.parent;
            }
        }

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

                        matchedSelector.remap = remapSelector(matchedSelector.name, node.parent.selector, termObj.name);

                        if (termObj.all) {
                            matchedSelector.scope = "all";
                        }

                        if (matchedSelector.type !== null) {
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
                    matchedSelectorObj = {
                        name: joinedNames,
                        scope: scope
                    };
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
                    if (!matches.mqRelationships.length) {
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
        // sort relationships alphabetically in descending order so
        // they will properly append after the original rule
        array.sort(function (a, b) {

            if (a < b) {
                return 1;
            }
            if (a > b) {
                return -1;
            }
            // a must be equal to b
            return 0;
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
            if (atRule.parent.name === 'media') {
                console.log('found it');
            }
            atRule.walkRules(function(rule) {
                referenceRules.push(rule);
            });

            atRule.remove();
        });
    };

    var findReferences = function findReferences(css) {
        // Now that our @reference blocks have been processed
        // Walk through our rules looking for @references declarations
        css.walkRules(function(rule) {
            // TODO :: if rule's selector has a ':reference()' pseudoclass, prepend matches to
            // the rule

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
