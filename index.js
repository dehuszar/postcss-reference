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

    var matchReferences = function matchReferences(referenceRules, terms) {
        var matches = {
            decls: [],
            relationships: []
        };

        referenceRules.forEach(function (reference, index, references) {
            // make sure any comma separated selector lists are broken out into an array
            var refSelectors = reference.selectors;

            refSelectors.forEach(function(refSelector, sindex, refSelectors) {

                terms.forEach(function(term, tindex, terms) {
                    var flagAll = (term.indexOf(" all") !== -1);
                    var tmpSelectorsArray = refSelectors;
                    // strip " all" from term now that flag is set
                    term = term.replace(" all", '');

                    // clean any whitespaces which might surround commas
                    term = term.trim();

                    // strip out selectors from list that don't start with current term
                    if (tmpSelectorsArray.length > 1 && tmpSelectorsArray.indexOf(term) !== -1) {
                        for (var i = 0; i < tmpSelectorsArray.length; i++){
                            var cleanSelector = tmpSelectorsArray[i].trim();
                        	if (cleanSelector.indexOf(term) !== 0) {
                                tmpSelectorsArray.splice(i, 1);
                            }
                        }

                        // then if we had to splice any selectors out of our
                        // reference's selector list, reassemble the array back to a string
                        refSelector = tmpSelectorsArray.join();
                    }


                    if (term === refSelector) {
                        extractMatchingDecls(matches.decls, reference);
                    } else if (reference.selector.indexOf(term) === 0 && flagAll) {
                        console.log(reference.selector + " is related to " + term);
                        // if the it's not an explicit match, but the 'all' flag is set
                        // and the selector describes a relationships to the term, gather
                        // those references for our matches array
                        // i.e. prevent matches with .button like .button-primary, but allow
                        // matches like .button .primary, .button.primary, or .button > .primary
                        var safeChars = [" ", ".", "#", "+", "~", ">", ":"];

                        if (reference.selector.length > term.length &&
                            reference.selector.charAt(term.length + 1).indexOf(safeChars)) {
                                extractMatchingRelationships(matches.relationships, reference);
                        }
                    }
                });
            });
        });

        return matches;
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

        matchArray.forEach(function(match) {
            var dup = null;

            dup = findDuplicates(matchArray, rule, "selector");

            if (dup !== null) {
                // TODO :: instead of replacing the rule outright, create mergeDuplicates
                // function to to compare rules with matching selector names and run
                // findDuplicates on their declarations
                // matchArray[dup].replaceWith(rule);

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
    };

    return function (css, result) {
        findReferenceableRules(css);
        findReferences(css);
        console.log(css);
    };
});
