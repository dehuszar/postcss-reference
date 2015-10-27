# PostCSS Reference [![Build Status][ci-img]][ci]

[PostCSS] plugin for referencing selectors' rules from CSS files and defined rulesets.  Will not output rules unless directly referenced in your stylesheet.  Concept follows LESS's [@import (reference) 'filename'](http://lesscss.org/features/#import-options-reference) functionality but with slightly different syntax.  The goal for the plugin is to allow for the kinds of advanced usage of LESS's `@extend` and `@import(reference)` methods as outlined in [this article on Semantic Remapping](https://medium.com/@dehuszar/semantic-remapping-with-css-pre-processors-906ba1a9910c) for PostCSS.  The Plugin can not currently replicate [all examples for this article](http://codepen.io/collection/DoEGWB/), but that is the current goal of the plugin.

### WARNING
This is still an early, un-tagged version.  While the plugin largely does what I intend at this time, there are bugs to be fixed, optimizations to make, and features to add which may change how your output is constructed.  Use with caution.

[PostCSS]: https://github.com/postcss/postcss
[ci-img]:  https://travis-ci.org/dehuszar/postcss-reference.svg
[ci]:      https://travis-ci.org/dehuszar/postcss-reference

TODO's for the next release:
 - Referencing rules from disparate media queries using `@references-media` atRules.  Presently, **postcss-reference** will only match rules that share the same `@media` atRules or if the 'all' flag is set and a requesting rule has no media query, then all media queries for the selector will get matched.  Future functionality will allow for rules at any media query to reference rules at any other explicitly defined media-query.  This would allow a desktop media query to extend rules that may be declared in a mobile media query or even extend rules that have explicitly no media wrapping them.
 - Allow for referencing selectors using [LESS's pseudoclass-style syntax for @extend](http://lesscss.org/features/#import-options-reference-example) `selector:references(selectorName) {}` style of referencing.

##Basic syntax:

Rules placed in the `@reference` block are mapped to a comparison array and discarded from the AST.  Rules from your stylesheet which then use an `@references selectorName;` declaration will have their requested selector compared against the rules in your comparison array.  Matching rules from the `@reference` block will then have their declarations merged into your requesting rules' declarations where the originating `@references selectorName;` request was made.  Preference is given to the requesting rule; meaning, if both rules have declarations with the same property name, such as "display", the property from the `@reference` block will be ignored.  This is to ensure that your stylesheets rules will *always override* referenced rules.

```css
/* Input */
@reference {
    header {
        display: block;
    }
}

header {
    @references header;
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

##Using the `all` flag:

When a `@references selectorName` declaration uses the 'all' flag, **postcss-reference** will look for all selectors in the `@reference` block which begin with the requested selector.

```css
/* Input */
@reference {
    header {
        display: block;
    }

    header h1 {
        font-family: Arial;
    }

    .widget header {
        padding-left: 1em;
    }
}

header {
    @references header all;
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

/* .widget header is ignored as this rule is not a match, pseudoclass, sibling, or descendent of the requesting rule. */
```

##Using `@import`:

(example assumes you have [postcss-import](https://github.com/postcss/postcss-import) installed and configured properly)
In this example we import the entirety of [Yahoo's PureCSS library](http://purecss.io/) so that we can reference the `.pure-button` and `.pure-button-primary` rules.  The unreferenced rules in pure.css are discarded.

```css
/* Input */
@reference {
    @import 'pure.css';
}

button {
    @references .pure-button, .pure-button-primary;
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
##Media Queries
Additionally, [Postcss Reference] can read rules from inside media queries.  At present, items can be referenced across matching media queries, or if a non-media query wrapped rule references a selector with the 'all' flag, and the requested reference rules have matches wrapped in any media queries.  For example:

```css
/* Input */
@reference {
    article {
        width: 100%;
    }

    @media (min-width: 900px) {
        article {
            width: 75%;
        }
    }
}

@media (min-width: 900px) {
    article {
        display: block;
        @references article;
    }
}

/* Output */
@media (min-width: 900px) {
    article {
        display: block;
        width: 75%;
    }
}
```

...or...

```css
/* Input */
@reference {
    article {
        width: 100%;
    }

    @media (min-width: 900px) {
        article {
            width: 75%;
        }
    }
}

article {
    display: block;
    @references article all;
}

/* Output */
article {
    display: block;
    width: 100%;
}

@media (min-width: 900px) {
    article {
        width: 75%;
    }
}
```

## Usage
At present, **postcss-reference** does not take any options.  That may be subject to change.
```js
postcss([ require('postcss-reference') ])
```

See [PostCSS] docs for examples for your environment.
