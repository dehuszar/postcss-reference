'use strict';

import test from 'tape';
import postcss from 'postcss';
import atImport from 'postcss-import';
import nested from 'postcss-nested';
import reference from '../../index.js';
import {name} from '../../package.json';

let tests = [{
  message: 'should match requested selector',
  fixture: '@reference { header { color: blue; display: block; } } header { @references header; display: block; margin: 1em; }',
  expected: 'header { color: blue; display: block; margin: 1em; }'
}, {
  message: "should merge duplicate selectors' declarations into single rule",
  fixture: '@reference { header { color: blue; display: block; } header { border: 1px solid black; } } header { @references header; display: block; margin: 1em; }',
  expected: 'header { color: blue; border: 1px solid black; display: block; margin: 1em; }'
}, {
  message: 'non-matching selectors in selector list get discarded',
  fixture: '@reference { header, section { padding: 0; } } header { @references header; display: block; margin: 1em; }',
  expected: 'header { padding: 0; display: block; margin: 1em; }'
}, {
  message: '@import files into the @reference block and reference them',
  fixture: '@reference { @import "test/imports/header.css" } header { @references header; display: block; margin: 1em; }',
  expected: 'header { color: blue; padding: 0; box-sizing: border-box; width: 100%; display: block; margin: 1em; }'
}, {
  message: 'pseudo-classed references like "selector:references(.another-selector)" will be treated like an @references atrule prepended above any existing declarations',
  fixture: '@reference { .uppercase { text-transform: uppercase; } } header h1:references(.uppercase) { display: inline-block; }',
  expected: 'header h1 { text-transform: uppercase; display: inline-block; }'
}, {
  message: 'referenced selectors which are related to the requested selectors and have the "all" flag set, will have their related rules inserted after the requesting rule',
  fixture: '@reference { header { color: blue; display: block; } header aside { width: 25%; } } header { @references header all; display: block; margin: 1em; }',
  expected: 'header { color: blue; display: block; margin: 1em; }\nheader aside { width: 25%; }'
}, {
  message: 'referenced selectors which contain nested selectors (using postcss-nested) and have the "all" flag set, will have their nested rules inserted after the requesting rule',
  fixture: '@reference { header { color: blue; display: block; aside { width: 25%; } } } header { @references header all; display: block; margin: 1em; }',
  expected: 'header { color: blue; display: block; margin: 1em; }\nheader aside { width: 25%; }'
}, {
  message: "referencing rules where the requesting rule's selector is different from the referenced rule's, the referenced rule's selector will get remapped to the requesting rule's selector",
  fixture: '@reference { header { color: blue; display: block; aside { width: 25%; } } } footer { @references header all; display: block; margin: 1em; }',
  expected: 'footer { color: blue; display: block; margin: 1em; }\nfooter aside { width: 25%; }'
}, {
  message: "referenced rules which contain 'before' raws (like '-' or '*'; often used in CSS hacks) will have those before raws preserved.",
  fixture: "@reference { h1 { display: block; font-size: 2.2em; font-weight: bold; } .pure-u-1-2, .pure-u-12-24 { width: 50%; *width: 49.9690%; } } .document-title { @references h1, .pure-u-1-2; text-align: center; }",
  expected: ".document-title { display: block; font-size: 2.2em; font-weight: bold; width: 50%; *width: 49.9690%; text-align: center; }"
}, {
  message: "multiple requested selectors which match multiple reference selectors will merge declarations into requesting rule",
  fixture: "@reference { h1 { display: block; font-size: 2.2em; font-weight: bold; } .pure-u-1-2, .pure-u-12-24 { width: 50%; *width: 49.9690%; } } .document-title { @references h1, .pure-u-1-2; text-align: center; }",
  expected: ".document-title { display: block; font-size: 2.2em; font-weight: bold; width: 50%; *width: 49.9690%; text-align: center; }"
}, {
  message: "referencing a rule with the all flag will also match hover, focus, or other pseudo-classes or -elements",
  fixture: "@reference { a:hover { text-decoration: underline; } } a { display: block; @references a all; }",
  expected: "a { display: block; }\na:hover { text-decoration: underline; }"
}, {
  message: 'With no params declared, a referencing rule not wrapped in a @references-media query will only match selectors also not wrapped in a media query',
  fixture: '@reference { article { width: 100%;} @media (min-width: 900px) { article { width: 75%; } } } article { display: block; @references article; }',
  expected: 'article { display: block; width: 100%; }'
}, {
  message: 'If both the reference rule and the requesting declaration are wrapped in matching media queries, the media query and referenced rule will be merged into the requesting rule',
  fixture: '@reference { article { width: 100%; } @media (min-width: 900px) { article { width: 75%; } } } @media (min-width: 900px) { article { display: block; @references article; } }',
  expected: '@media (min-width: 900px) { article { display: block; width: 75%; } }'
}, {
  message: 'Referencing a selector that has no media query, when the requesting selector is in a media query will yield a match when the @references request is wrapped with an @references-media at Rule with no params',
  fixture: '@reference { .my-glorious-selector { color: blue; display: block; } } @media (min-width: 768px) { button { color: black; display: inline-block; @references-media { @references .my-glorious-selector all; } } }',
  expected: '@media (min-width: 768px) { button { color: blue; display: block } }'
}, {
  message: 'Referencing a selector that has a media query, when the requesting selector is in a different media query will yield a match when the @references request is wrapped with an @references-media at Rule with the target media query as a parameter',
  fixture: '@reference { @media (max-width: 479px) { .my-glorious-selector { color: blue; display: block; } } } @media (min-width: 768px) { button { color: black; display: inline-block; @references-media (max-width: 479px) { @references .my-glorious-selector all; } } }',
  expected: '@media (min-width: 768px) { button { color: blue; display: block } }'
}, {
  message: 'If the requesting rule has no media query, but has the all flag set, reference rules which match the selector should return rules from all media-queries',
  fixture: '@reference { article { width: 100%; } @media (min-width: 900px) { article { width: 75%; } } } article { display: block; @references article all; }',
  expected: 'article { display: block; width: 100%; }\n@media (min-width: 900px) {\n article { width: 75%; } }'
}];

function process (css, options) {
  return postcss().use(atImport()).use(nested()).use(reference()).process(css).css;
}

test(name, t => {
  t.plan(tests.length);

  tests.forEach(test => {
    let options = test.options || {};
    t.equal(process(test.fixture, options), test.expected, test.message);
  });
});

test('should use the postcss plugin api', t => {
  t.plan(2);
  t.ok(reference().postcssVersion, 'should be able to access version');
  t.equal(reference().postcssPlugin, name, 'should be able to access name');
});
