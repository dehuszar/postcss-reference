module.exports = {
  'basic-match': {
    message: 'should match requested selector',
    source: 'basic-match.css',
    expect: 'basic-match.expect.css'
  },
  'merge-duplicates': {
    message: "should merge duplicate selectors' declarations into single rule",
    source: 'merge-duplicates.css',
    expect: 'merge-duplicates.expect.css'
  },
  'discard-non-matches': {
    message: 'non-matching selectors in selector list get discarded',
    source: 'discard-non-matches.css',
    expect: 'discard-non-matches.expect.css'
  },
  'relative-match-all': {
    message: 'referenced selectors which are related to the requested selectors and have the "all" flag set, will have their related rules inserted after the requesting rule',
    source: 'relative-match-all.css',
    expect: 'relative-match-all.expect.css'
  },
};