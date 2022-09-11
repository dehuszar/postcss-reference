const { atRule } = require('postcss');
const determineMqsMatch = require('./determine-mq-match');
const determineRefMq = require('./determine-ref-mq');
const extractDecls = require('./extract-decls');
const matchReferences = require('./match-references');

module.exports = (requestingReference, referenceList) => {
  const requestingNode = requestingReference.parent;

  const matches = matchReferences(referenceList, requestingReference);

  if (matches.length > 0) {
    for (const match of matches) {
      const requestingNodeDecls = requestingNode.nodes.filter(({prop}) => Boolean(prop));
      // we don't want to remap any declarations which will be overridden in the requesting rule
      const uniqueMatchDecls = match.decls
        .filter(
          ({prop: matchDeclProp}) => 
            !requestingNodeDecls.find(
              ({prop}) => prop === matchDeclProp));

      for (const decl of uniqueMatchDecls) {
        // reset any formatting from the references
        decl.raws.before = '\n  ';
        decl.raws.between = ': ';

        requestingReference.after(decl);
      }
    }
  }

  // now that we're done using the @references atRule remove it from the requesting node
  requestingReference.remove();

  // the referenced rules may have declarations that already exist in our requesting node
  // we want to trim out

  return;
}