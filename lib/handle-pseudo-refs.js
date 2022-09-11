// checks for :references() pseudoclass
module.exports = function handlePseudoRefs(rule) {
  var pseudoRef = ":references(",
      pseudoRefIndex = rule.selector.indexOf(pseudoRef),
      pseudoRefEnd = rule.selector.indexOf(")"),
      pseudoRefStr = "",
      newRef;

  if (pseudoRefIndex !== -1) {
    pseudoRefStr = rule.selector.slice(pseudoRefIndex + pseudoRef.length, pseudoRefEnd);
    newRef = postcss.atRule({
      name: 'references',
      params: pseudoRefStr
    });
    rule.prepend(newRef);
    rule.selector = rule.selector.slice(0, pseudoRefIndex);
  }
};