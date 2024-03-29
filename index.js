const findReferenceableRules = require('./lib/find-referenceable-rules');
const remapReferences = require('./lib/remap-references');

const plugin = (opts = {}) => {
  opts = opts || {
    debug: false
  };

  var referenceSource = [];
  
  return {
    postcssPlugin: 'postcss-reference',
    Comment (comment) {
      comment.remove();
    },
    AtRule: {
      reference: atRule => findReferenceableRules(atRule, referenceSource),
      references: (atRule, { Rule, Declaration }) => remapReferences(atRule, referenceSource, { Rule, Declaration })
    }
  }
};

plugin.postcss = true

module.exports = plugin;
