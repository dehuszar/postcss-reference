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
  'pseudo-class-matching': {
    message: 'referencing a rule with the all flag will also match hover, focus, or other pseudo-classes or -elements',
    source: 'pseudo-class-matching.css',
    expect: 'pseudo-class-matching.expect.css'
  },
  'multiple-reference-selectors': {
    message: '@references request includes multiple, comma-separated selectors which match multiple referenceable rules will merge declarations into requesting rule',
    source: 'multiple-reference-selectors.css',
    expect: 'multiple-reference-selectors.expect.css'
  },
  'ignore-unrequested-media-queries': {
    message: 'With no params declared, a referencing rule not wrapped in a @references-media query will only match selectors also not wrapped in a media query',
    source: 'ignore-unrequested-media-queries.css',
    expect: 'ignore-unrequested-media-queries.expect.css'
  },
  'remap-matching-media-queries': {
    message: 'If both the referenceable rule and the requesting declaration are wrapped in matching media queries, the media query and referenced rule will be merged into the requesting rule',
    source: 'remap-matching-media-queries.css',
    expect: 'remap-matching-media-queries.expect.css'
  },
  'references-media-atrules-no-mq': {
    message: 'Referencing a selector that has no media query, when the requesting selector is in a media query will yield a match when the @references request is wrapped with an @references-media at Rule with no params',
    source: 'references-media-atrules-no-mq.css',
    expect: 'references-media-atrules-no-mq.expect.css'
  },
};