# PostCSS Reference [![Build Status][ci-img]][ci]

[PostCSS] plugin for referencing selectors' rules from CSS files and defined rulesets.  Will not output rules unless directly referenced in your stylesheet.  Concept follows LESS's [@import (reference) 'filename'](http://lesscss.org/features/#import-options-reference) functionality but with slightly different syntax.

This is currently a Work In Progress, and should not be considered production ready by any stretch.  That said, a few pieces are currently functional.

What should work (but definitely needs more testing):
 - Referencing a bit of CSS in the `@reference` atRule will extract declarations to your requesting rule.
 - Using the 'all' flag will extract all siblings, descedents, and pseudoclassed rules which start with your requested selector
 - Plugins like `postcss-import` should work, so long as their output is valid CSS and is returned within the @reference block.  Example below
 - All CSS in the `@reference` wrapping block will be discarded.  Only matched selectors will be output, and will only be output in the declarations list of your requesting rule

[PostCSS]: https://github.com/postcss/postcss
[ci-img]:  https://travis-ci.org/dehuszar/postcss-reference.svg
[ci]:      https://travis-ci.org/dehuszar/postcss-reference

Basic Usage:

```css
/* Input */
@reference {
    header {
        display: block;
    }
}

header {
    @references(header);
    margin: 0;
}
```

```css
/* Output */
header {
    display: block;
    margin: 0;
}
```

Using the `all` flag:

```css
/* Input */
@reference {
    header {
        display: block;
    }

    header h1 {
        font-family: Arial;
    }
}

header {
    @references(header);
    margin: 0;
}
```

```css
/* Output */
header {
    display: block;
    margin: 0;
}

header h1 {
    font-family: Arial;
}
```

Using `@import` (example assumes you have [postcss-import](https://github.com/postcss/postcss-import) installed and configured properly):

```css
/* Input */
@reference {
    @import 'pure.css';
}

button {
    @references(.pure-button, .pure-button-primary);
}
```

```css
/* Output */
button {
    display: inline-block;
    zoom: 1;
    line-height: normal;
    white-space: nowrap;
    vertical-align: middle;
    text-align: center;
    cursor: pointer;
    -webkit-user-drag: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    -webkit-box-sizing: border-box;
    -moz-box-sizing: border-box;
    box-sizing: border-box;
    font-family: inherit;
    font-size: 100%;
    padding: 0.5em 1em;
    color: #444;
    border: 1px solid #999;
    background-color: #E6E6E6;
    text-decoration: none;
    border-radius: 2px;
}
```

## Usage
At present, *postcss-reference* does not take any options.  That may be subject to change.
```js
postcss([ require('postcss-reference') ])
```

See [PostCSS] docs for examples for your environment.
