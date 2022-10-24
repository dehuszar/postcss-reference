const extractDecls = require('./extract-decls');
const extractTerms = require('./extract-terms');
const findParentMq = require('./find-parent-mq');
const findParentReferencesMediaMq = require('./find-parent-ref-mq');
const findParentSelector = require('./find-parent-selector');
const remapSelector = require('./remap-selector');

// prevent matches with .button like .button-primary, but allow
// matches like .button .primary, .button.primary, or .button > .primary
const safeChars = [" ", ".", "#", "+", "~", ">", ":", "["];

module.exports = (referenceList, requestingDecl) => {
  const reqSelector = findParentSelector(requestingDecl);
  
  // extract our @references() contents and split selectors into an array.
  // terms and params are a string at this point.  Convert to an array of
  // well defined objects for cleaner processing
  const nodeTerms = extractTerms(requestingDecl);

  const requestingMq = findParentMq(requestingDecl);

  const matchedSelectorList = referenceList
    .reduce((acc, referenceRule) => {
      // Deep clone the reference rule so we can safely mutate it
      const reference = JSON.parse(JSON.stringify(referenceRule));

      const referenceSelectors = reference.selectors
        ? reference.selectors
        : reference.selector.split(',').map(s => s.trim());

      const refMq = findParentMq(referenceRule);
      const targetMq = findParentReferencesMediaMq(requestingDecl);

      const matchedSelector = nodeTerms.map(nodeTerm => {
        let match = {
          name: referenceRule.selector
        };
        
        // If MQs don't match,
        // we're not defining a @references-media target, and
        // aren't expanding search to "all" match possibilities, then skip
        if ( refMq !== requestingMq
          && targetMq === undefined
          && !nodeTerm.all
        ) {
          return acc;
        }

        const exact = referenceSelectors.find(selector => nodeTerm.name === selector);
        const relative = referenceSelectors.find(selector => 
          selector.length > nodeTerm.name.length
            && nodeTerm.all
            && safeChars.indexOf(selector.charAt(nodeTerm.name.length)) !== -1);

        match.type = Boolean(exact)
          ? "exact"
          : Boolean(relative)
            ? "relative"
            : null;
        
        match.term = Boolean(exact)
          ? nodeTerms.map(t => t.name).join()
          : relative;

        match.refMq = refMq;
        match.requestingMq = requestingMq;
        match.targetMq = targetMq;

        if (match.type !== null) {
          match.remap = remapSelector(referenceRule.selector, reqSelector, nodeTerm.name)

          if (nodeTerm.all) {
            match.scope = "all"
          }

          match.decls = extractDecls(referenceRule);

          return match;
        }
      });

      return acc.concat(matchedSelector);
    }, []);

    return matchedSelectorList.filter(m => Boolean(m));
};