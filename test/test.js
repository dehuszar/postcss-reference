'use strict';

import test from 'tape';
import postcss from 'postcss';
var atImport = require("postcss-import");
var nested = require("postcss-nested");
import plugin from '../../index.js';
import {name} from '../../package.json';

let tests = [{
    message: 'should match requested selector',
    fixture: '@reference{ header { color: blue; display: block; } } header { @references header; display: block; margin: 1em; }',
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
    message: '@import files into the @reference block and extend rules from inside',
    fixture: '@reference{ @import "test/imports/header.css" } header { @references header; display: block; margin: 1em; }',
    expected: 'header { color: blue; padding: 0; box-sizing: border-box; width: 100%; display: block; margin: 1em; }'
}, {
    message: 'referenced selectors which contain nested selectors (using postcss-nested) and have the "all" flag set, will have their nested rules inserted after the requesting rule',
    fixture: '@reference { header { color: blue; display: block; aside { width: 25%; } } } header { @references header all; display: block; margin: 1em; }',
    expected: 'header { color: blue; display: block; margin: 1em; }\nheader aside { width: 25%; }'
}, {
    message: 'With no params declared, a referencing rule not wrapped in a @references-media query will only match selectors also not wrapped in a media query',
    fixture: '@reference { article { width: 100%;} @media (min-width: 900px) { article { width: 75%; } } } article { display: block; @references article; }',
    expected: 'article { display: block; width: 100%; }'
}, {
    message: "When wrapped in a @references-media block, @references() requests will return matches from the requested media query",
    fixture: '@reference { article { width: 100%;} @media (min-width: 900px) { article { width: 75%; } } } article { display: block; @references-media (min-width: 900px) { @references article all; } }',
    expected: 'article { display: block; width: 100%; } @media (min-width: 900px) { article { width: 75%; } }'
}/*, {
    message: 'referencing selectors from inside a media query should result in the match of the selector in only that media query',
    fixture: '@reference { article { width: 100%; @media (min-width: 900px) { width: 75%; } } } article { @media (min-width: 900px) { display: block; @references article; } }',
    expected: 'article { display: block; width: 100%; } @media (min-width: 900px) { article { width: 75%; } }'
}, {
    message: 'if a specific media query is specified as a param when refencing, only match for requested the media query regardless of the requesting rule&#39s media query is',
    fixture: '@reference { article { width: 100%; @media (min-width: 900px) { width: 75%; } } } article { @media (min-width: 900px) { display: block; @references article; } }',
    expected: 'article { display: block; width: 100%; } @media (min-width: 900px) { article { width: 75%; } }'
}*/];

function process (css, options) {
    return postcss().use(atImport()).use(nested()).use(plugin(options)).process(css).css;
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
    t.ok(plugin().postcssVersion, 'should be able to access version');
    t.equal(plugin().postcssPlugin, name, 'should be able to access name');
});
