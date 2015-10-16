var postcss = require('postcss');
var find = require('array-find');
var referenceableNodes = [];

module.exports = postcss.plugin('postcss-reference', function (opts) {
    opts = opts || {
        debug: false
    };

    // Work with options here

    var referenceRules = [];
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

    var findReferences = function findReferences(css) {
        // Now that our @reference blocks have been processed
        // Walk through our rules looking for @references declarations
        css.walkRules(function(rule) {
            // TODO :: if rule's selector has a pseudoclass, prepend matches to
            // the rule

            rule.walk(function(node) {

                if (node.type === 'atrule' &&
                    node.name === 'references') {

                    // extract our @references() contents and split selectors into an array
                    var terms = node.params.replace('(', '').replace(')', '').split(',');

                    // check our reference array for any of our terms
                    var matches = matchReferences(referenceRules, terms);

                    // if referenced and referencing rules have declarations
                    // with of same property, defer to the referencing rule
                    rule.walkDecls(function(decl) {
                        matches.decls.forEach(function(match, d, matchedDecls) {
                            if (decl.prop === match.prop) {
                                matchedDecls.splice(d, 1);
                            }
                        });
                    });

                    for (var m in matches.decls) {
                        rule.insertBefore(node, matches.decls[m]);
                    }

                    if (matches.relationships.length) {
                        // sort relationships alphabetically in descending order so
                        // they will properly append after the original rule
                        matches.relationships.sort(function (a, b) {

                            if (a < b) {
                                return 1;
                            }
                            if (a > b) {
                                return -1;
                            }
                            // a must be equal to b
                            return 0;
                        });

                        matches.relationships.forEach(function(newRule) {
                            css.insertAfter(rule, newRule);
                        });
                    }

                    node.remove();
                }
            });
        });
    };

    var testRelationExistsIn = function testSelectorExistsIn(item, array, prop) {
        var value = false;

        array.forEach(function (obj) {
            if (item.indexOf(obj[prop]) === 0) {
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

            if (dup !== null) {
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
                    rule.walkDecls(function(decl) {
                        var dupDecl = findDuplicates(matchArray[dup].nodes, rule.nodes[decl], "prop");

                        matchArray[dup].nodes[dupDecl].remove();
                    });
                } else {
                    // otherwise add to the declarations list
                    matchArray.push(rule);
                }
            });
        }
    };

    var findDuplicates = function findDuplicates(matchArray, node, childParam) {
        var dup = null;

        find(matchArray, function(match, index, array) {
            if (match[childParam] === node[childParam]) {
                dup = index;
            }
        });

        return dup;
    };

    var handleExactMatches = function handleExactMatches(obj, objParam, termsArray, destination) {
        obj.selectors.filter(function(ref) {
            var hasRelation = testRelationExistsIn(ref, termsArray, objParam);

            if (hasRelation) {
                destination.push(ref.trim());
            }
        });
    };

    var handleRelationshipMatches = function handleRelationshipMatches(/* TODO :: need generalized params */) {
        // TODO :: replace previous implementation specifics with generalized params
        matchedRefSelectors.forEach(function(refSelector, sindex, refSelectors) {

            processedTerms.forEach(function(term, tindex, terms) {
                // var flagAll = (term.indexOf(" all") !== -1);
                var tmpSelectorsArray = refSelectors;

                // if it's an exact match already in the matches references obj...
                if (term.name === refSelector) {
                    // just merge up the declarations of the successfully
                    // referenced rule
                    extractMatchingDecls(matches.decls, reference);

                } else if (reference.selector.indexOf(term.name) === 0 && term.all) {
                    // otherwise, if the it's not an explicit match, but the 'all' flag is set
                    // and the selector describes a relationships to the term, gather
                    // those references for our matches array
                    // i.e. prevent matches with .button like .button-primary, but allow
                    // matches like .button .primary, .button.primary, or .button > .primary
                    var safeChars = [" ", ".", "#", "+", "~", ">", ":"];

                    if (reference.selector.length > term.name.length &&
                        safeChars.indexOf(reference.selector.charAt(term.name.length)) === 0) {
                            extractMatchingRelationships(matches.relationships, reference);
                    }
                }
            });
        });
    }

    var matchReferences = function matchReferences(referenceRules, terms) {
        var matches = {
            decls: [],
            relationships: [],
            mqDecls: {
                mediaQuery: null,
                nodes: []
            },
            mqRelationships: {
                mediaQuery: null,
                nodes: []
            }
        };

        // terms and params are a string at this point.  Convert to an array of
        // well defined objects for cleaner processing
        var processedTerms = [];

        terms.forEach(function(term) {
            var obj = {
                all: false,
                mq: null,
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

        referenceRules.forEach(function (reference, index, references) {
            // Strip out any selectors in our current reference rule which don't match
            // any of our requested terms
            var matchedRefSelectors = [];

            handleExactMatches(reference, "name", processedTerms, matchedRefSelectors);

            handleRelationshipMatches(reference, matchedRefSelectors, matches.relationships);
            // matchedRefSelectors.forEach(function(refSelector, sindex, refSelectors) {
            //
            //     processedTerms.forEach(function(term, tindex, terms) {
            //         // var flagAll = (term.indexOf(" all") !== -1);
            //         var tmpSelectorsArray = refSelectors;
            //
            //         // if it's an exact match already in the matches references obj...
            //         if (term.name === refSelector) {
            //             // just merge up the declarations of the successfully
            //             // referenced rule
            //             extractMatchingDecls(matches.decls, reference);
            //
            //         } else if (reference.selector.indexOf(term.name) === 0 && term.all) {
            //             // otherwise, if the it's not an explicit match, but the 'all' flag is set
            //             // and the selector describes a relationships to the term, gather
            //             // those references for our matches array
            //             // i.e. prevent matches with .button like .button-primary, but allow
            //             // matches like .button .primary, .button.primary, or .button > .primary
            //             var safeChars = [" ", ".", "#", "+", "~", ">", ":"];
            //
            //             if (reference.selector.length > term.name.length &&
            //                 safeChars.indexOf(reference.selector.charAt(term.name.length)) === 0) {
            //                     extractMatchingRelationships(matches.relationships, reference);
            //             }
            //         }
            //     });
            // });
        });

        return matches;
    };

    return function (css, result) {
        findReferenceableRules(css);
        findReferences(css);
    };
});
