var postcss = require('postcss');
var referenceableNodes = [];

module.exports = postcss.plugin('postcss-import-references', function (opts) {
    opts = opts || {
        debug: false
    };

    // Work with options here

    var referenceRules = [];
    var referenceDecls = [];
    var findReferenceableRules = function findReferenceableRules(css) {
        // Walk through list of rules in @reference blocks,
        // push them into the references array and then remove them
        // so they don't get output to the compiled CSS unless matched.
        css.walkAtRules('reference', function(atRule) {
            atRule.walkRules(function(rule) {
                if (opts.debug === true) {
                    console.log("\n------------\nInside Referenceable Rules: " + rule.selector + "\n");
                    console.log(rule);}

                referenceRules.push(rule);
                rule.remove();
            });
        });
    };

    var findReferences = function findReferences(css) {
        // Now that our @reference blocks have been processed
        // Walk through our rules looking for @references declarations
        css.walkRules(function(rule) {
            rule.walk(function(node) {
                if (node.type === 'atrule' &&
                    node.name === 'references') {
                    // check if the node being referenced matches any rules in
                    // our references array
                    var terms = node.params.replace('(', '').replace(')', '');
                    var matches = matchReferences(terms);
                    var newDecls = [];

                    // if referenced and referencing rules have declarations
                    // with of same property, defer to the referencing rule
                    rule.walkDecls(function(decl) {
                        for (var i in matches) {
                            if (decl.prop === matches[i].prop) {
                                matches.splice(i, i + 1);
                            }
                        }
                    });

                    for (var i in matches) {
                        rule.insertAfter(node, matches[i].nodes);
                    }

                    node.remove();

                    console.log("\n------------\nHere's our new rule");
                    console.log(rule);
                }
            });
        });
    };

    var matchReferences = function matchReferences(terms) {
        var matches = [];

        for (var i in referenceRules) {

            if (referenceRules[i].selector === terms) {
                matches.push(referenceRules[i]);
            }
        }

        return matches;
    };

    return function (css, result) {

        findReferenceableRules(css);

        if (opts.debug === true) {
            console.log("\n------------\nContents of References object");
            console.log(referenceRules);}

        findReferences(css);
    };
});
