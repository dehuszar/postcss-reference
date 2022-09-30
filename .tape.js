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
  'remap-selector-name': {
    message: "referencing rules where the requesting rule's selector is different from the referenced rule's, the referenced rule's selector will get remapped to the requesting rule's selector",
    source: 'remap-selector-name.css',
    expect: 'remap-selector-name.expect.css'
  },
  'retain-before-raws': {
    message: "referenced rules which contain 'before' raws (like '-' or '*'; often used in CSS hacks) will have those before raws preserved.",
    source: 'retain-before-raws.css',
    expect: 'retain-before-raws.expect.css'
  },
};