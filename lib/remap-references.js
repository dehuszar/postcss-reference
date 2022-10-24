const { AtRule } = require('postcss');
const findParentRefMq = require('./find-parent-ref-mq');
const matchReferences = require('./match-references');

const targetAndRefMqsExistButDontMatch = (targetMq, refMq) => (Boolean(targetMq) && Boolean(targetMq.params) && Boolean(refMq) && targetMq.params !== refMq);
const refMqExistsButNoTargetMq = (targetMq, refMq) => (!Boolean(targetMq) && Boolean(refMq));

const filterUniqueMatchDecls = (match, requestingNodeDecls) => match.decls
.filter(
  ({prop: matchDeclProp}) => 
    !requestingNodeDecls.find(
      ({prop}) => prop === matchDeclProp));

module.exports = (requestingReference, referenceList, methods) => {
  const { Rule, Declaration } = methods;
  const requestingNode = requestingReference.parent;
  const requestingRefMqNode = findParentRefMq(requestingReference);
  const requestingReferenceRawsBefore = requestingReference.raws.before;

  const matches = matchReferences(referenceList, requestingReference);

  const exactMatches = matches.filter(m => m.type === "exact");
  const relativeMatches = matches.filter(m => m.type === "relative");
  
  // If we add decls after the @references decl, we will, on subsequent passes,
  // start mangling injection order, so we keep a marker of where we last
  // injected and proceed from there.  Only affects exact matches.
  let currentMatchIndex = requestingNode.index(requestingReference);

  if (exactMatches.length > 0) {
    for (const match of exactMatches) {
      const { requestingMq, refMq, scope, targetMq } = match;

      if (requestingMq !== refMq
        && (targetAndRefMqsExistButDontMatch(targetMq, refMq)
          || refMqExistsButNoTargetMq(targetMq, refMq)
        )
        && scope === "all"
      ) {
        // Then append any selector matches wrapped in non-matching MQs
        // after our requesting node
        const newMq = new AtRule({ name: "media", params: refMq });
        newMq.raws.before = '\n\n';
        
        const newMqRule = new Rule({ selector: match.name })
        newMqRule.raws.before = '\n  ';
        newMqRule.append(match.decls);
        newMqRule.nodes.forEach(n => {
          n.raws.before = `${newMqRule.raws.before}  `;
        })
        newMq.append(newMqRule);
        
        requestingNode.after(newMq);
      } else {
        const requestingNodeDecls = requestingNode.nodes.filter(({prop}) => Boolean(prop));
      
        // we don't want to remap any declarations which will be overridden in the requesting rule
        const uniqueMatchDecls = filterUniqueMatchDecls(match, requestingNodeDecls);

        for (const decl of uniqueMatchDecls) {
          // reset any formatting from the references
          decl.raws.before = `${requestingReferenceRawsBefore}${decl.raws.before.trim()}`;
          decl.raws.between = ': ';

          requestingNode.nodes[currentMatchIndex].after(decl);

          currentMatchIndex = currentMatchIndex + 1
        }
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

  // if our requesting reference was inside a @references-media block,
  // we now want to hoist those decls up and remove the block
  if (requestingRefMqNode){
    const targetNode = requestingRefMqNode.parent;
    for (const reqRefDecl of requestingRefMqNode.nodes) {
      const targetDecls = targetNode.nodes.filter(n => n.type === 'decl');
      const declExists = targetDecls
        .find(d => d.prop === reqRefDecl.prop)
      
      declExists
        ? declExists.value = reqRefDecl.value
        // here we don't want to reuse targetDecls as it will now be different if we have previously appended
        : targetNode.nodes.filter(n => n.type === 'decl').after(reqRefDecl);
    }

    requestingNode.remove();
  }

  return;
}