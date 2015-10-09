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

            rule.walk(function(node) {

                if (node.type === 'atrule' &&
                    node.name === 'references') {
                    // check if the referenced node's params match any rules in
                    // our references array
                    var terms = node.params.replace('(', '').replace(')', '').split(',');
                    var matches;

                    // check for matches
                    matches = matchReferences(referenceRules, terms);

                    // if referenced and referencing rules have declarations
                    // with of same property, defer to the referencing rule
                    // TODO :: convert to a nodes.forEach loop
                    rule.walkDecls(function(decl) {
                        for (var d in matches.decls) {
                            if (decl.prop === matches.decls[d].prop) {
                                matches.decls.splice(d, d + 1);
                            }
                        }
                    });

                    for (var m in matches.decls) {
                        rule.insertBefore(node, matches.decls[m]);
                    }

                    node.remove();
                }
            });
        });
    };

    var replaceDuplicates = function replaceDuplicates(matchArray, decl) {
        var dup = null;

        find(matchArray, function(match, index, array) {
            if (match.prop === decl.prop) {
                dup = index;
            }
        });

        return dup;
    };

    var matchReferences = function matchReferences(referenceRules, terms) {
        var matches = {
            decls: []
        };

        referenceRules.forEach(function (rule) {
            // make sure any comma separated selector lists are broken out
            var selectors = rule.selector.split(',');

            selectors.forEach(function(selector) {

                terms.forEach(function(term) {
                    // clean any whitespaces which might surround commas
                    term = term.trim();

                    if (term === selector) {

                        rule.walkDecls(function(decl) {
                            var dup = null;

                            // check for duplicates in our list of matches
                            dup = replaceDuplicates(matches.decls, decl);

                            if (dup !== null) {
                                // if it's a dupe, replace existing rule
                                matches.decls[dup].replaceWith(decl);
                            } else {
                                // otherwise add to the declarations list
                                matches.decls.push(decl);
                            }
                        });
                    }
                });
            });

            // TODO :: when includeAll functionality is added
            // console.log(!referenceRules[rule].selector.indexOf(terms));
        });

        return matches;
    };

    return function (css, result) {
        findReferenceableRules(css);
        findReferences(css);
    };
});
