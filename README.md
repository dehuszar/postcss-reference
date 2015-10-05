# PostCSS References [![Build Status][ci-img]][ci]

[PostCSS] plugin for referencing selectors' rules from CSS files and defined rulesets.  Will not output rules unless directly referenced in your stylesheet.  Concept follows LESS's [@import (reference) 'filename'](http://lesscss.org/features/#import-options-reference) functionality but with slightly different syntax.  

[PostCSS]: https://github.com/postcss/postcss
[ci-img]:  https://travis-ci.org/dehuszar/postcss-references.svg
[ci]:      https://travis-ci.org/dehuszar/postcss-references

```css
.foo {
    /* Input example */
}
```

```css
.foo {
  /* Output example */
}
```

## Usage

```js
postcss([ require('postcss-references') ])
```

See [PostCSS] docs for examples for your environment.
