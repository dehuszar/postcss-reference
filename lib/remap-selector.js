module.exports = (refSelector, reqSelector, term) =>
  refSelector.replace(term, reqSelector);