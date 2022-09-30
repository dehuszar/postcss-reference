const matchReferences = require('./match-references');

module.exports = (requestingReference, referenceList, methods) => {
  const { Rule, Declaration } = methods;
  const requestingNode = requestingReference.parent;

  const matches = matchReferences(referenceList, requestingReference);

  const exactMatches = matches.filter(m => m.type === "exact");
  const relativeMatches = matches.filter(m => m.type === "relative");
  
  // If we add decls after the @references decl, we will, on subsequent passes,
  // start mangling injection order, so we keep a marker of where we last
  // injected and proceed from there.  Only affects exact matches.
  let currentMatchIndex = requestingNode.index(requestingReference);

  if (exactMatches.length > 0) {
    for (const match of exactMatches) {
      const requestingNodeDecls = requestingNode.nodes.filter(({prop}) => Boolean(prop));
      // we don't want to remap any declarations which will be overridden in the requesting rule
      const uniqueMatchDecls = match.decls
        .filter(
          ({prop: matchDeclProp}) => 
            !requestingNodeDecls.find(
              ({prop}) => prop === matchDeclProp));

      for (const decl of uniqueMatchDecls) {
        // reset any formatting from the references
        decl.raws.before = `\n  ${decl.raws.before.trim()}`;
        decl.raws.between = ': ';

        requestingNode.nodes[currentMatchIndex].after(decl);

        currentMatchIndex = currentMatchIndex + 1
      }
    }
  }

  if (relativeMatches.length > 0) {
    for (const match of relativeMatches) {
      const { remap: selector, decls } = match;

      const newRule = new Rule({ selector });
      decls.map(
        d => newRule.push(
          new Declaration({
            prop: d.prop,
            value: d.value
          })));
      
      newRule.raws.before = '\n\n';

      requestingNode.after(newRule);
    }
  }

  // now that we're done using the @references atRule remove it from the requesting node
  requestingReference.remove();

  // the referenced rules may have declarations that already exist in our requesting node
  // we want to trim out

  return;
}