# PostCSS Reference [![Build Status][ci-img]][ci]

[PostCSS](https://github.com/postcss/postcss) plugin for referencing selectors' rules from CSS files and defined rulesets.  Will not output rules unless directly referenced in your stylesheet.  Concept follows LESS's [@import (reference) 'filename'](http://lesscss.org/features/#import-options-reference) functionality but with slightly different syntax and usage.  The goal for the plugin is to allow for the kinds of advanced usage of LESS's `@extend` and `@import(reference)` methods as outlined in [this article on Semantic Remapping](https://medium.com/@dehuszar/semantic-remapping-with-css-pre-processors-906ba1a9910c) for PostCSS.  The Plugin can currently replicate [most examples for this article](http://codepen.io/collection/DoEGWB/).

[PostCSS]: https://github.com/postcss/postcss
[ci-img]:  https://travis-ci.org/dehuszar/postcss-reference.svg
[ci]:      https://travis-ci.org/dehuszar/postcss-reference



## Basic syntax:

Rules placed in the `@reference` block are mapped to a comparison array and discarded from the AST.  Rules from your style sheet which then use an `@references selectorName;` declaration will have their requested selector compared against the rules in your comparison array.  All instances of `@references` *have* to be declarations.


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

## Using the `all` flag:

When a `@references selectorName` declaration uses the 'all' flag, [PostCSS Reference] will look for all selectors in the `@reference` block which begin with the requested selector.

```css
/* Input */
@reference {
    header {
        display: block;
    }

    header h1 {
        font-family: Arial;
    }

    .header-alt {
        color: blue;
        font-family: "Times New Roman";
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
```

Note that `.header-alt` and `.widget header` are ignored as those rules are not an exact match, pseudo-class, sibling, or descendant of the requesting rule.

Make sure the rules being referenced come before the rule whose `@references` declaration is making the request; i.e. put your dependencies first.  This allows for very powerful CSS component abstractions.

## Media Queries

Additionally, [Postcss Reference] can read rules from inside media queries.  Items can be referenced across matching media queries, or if a non-media-query wrapped rule references a selector with the 'all' flag, and the requested reference rules have matches wrapped in any media queries.  For example:

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

comma separated `@references` requests will return declarations from any matched selectors.  So...

```css
    header {
        @references header, footer;
    }

```

...would match any header or footer selectors.  It would also match selectors that have the same comma separated combination in any order.  So a reference rule with a selector like `footer, header` would return the same declarations as just `header`.  Superfluous or unmatched selectors are ignored.  So `footer, header, section {}` would still return a match, and `section` would be ignored.

Comma separated reference requests can have their own parameters.  So a declaration like `@references header all, footer` would return all exact _and_ related matches for header, but only exact matches for footer.

## Cross media-query references

PostCSS Reference has the unique ability to reference selectors across disparate media queries.

Referencing a selector that has _no media query_, when the requesting selector _is in a media query_ will yield a match if the `@references` request is wrapped with an `@references-media` atRule with no params

```css
  /* Input */
  @reference {
    .my-glorious-selector {
      color: blue;
      display: block;
    }
  }

  @media (min-width: 768px) {
    button {
      color: black;
      display: inline-block;

      @references-media {
        @references .my-glorious-selector all;
      }
    }
  }  

  /* Output */
  @media (min-width: 768px) {
    button {
      color: blue;
      display: block
    }
  }
```

Referencing a selector that has a media query, when the requesting selector is in a _different_ media query will yield a match if the `@references` request is wrapped with an `@references-media` atRule and has the target media query as a parameter
```css
  /* Input */
  @reference {
    @media (max-width: 479px) {
      .my-glorious-selector {
        color: blue;
        display: block;
      }
    }
  }

  @media (min-width: 768px) {
    button {
      color: black;
      display: inline-block;

      @references-media (max-width: 479px) {
        @references .my-glorious-selector all;
      }
    }
  }

  /* Output */
  @media (min-width: 768px) {
    button {
      color: blue;
      display: block
    }
  }
```

Since the v2.0 rewrite [PostCSS Reference] does not currently provide predictable support for nested style inside the `@reference` block.  This is something I may work on if there is desire for it.

## Using `@import`:

`postcss-import` and most other `@import` related plugins do not resolve well inside the `@reference` AtRule block, so [PostCSS Reference] includes its own logic for retrieving the contents of local files and injecting any parsed rules into the requesting stylesheet.

In this example we import the entirety of [Yahoo's PureCSS core library](http://purecss.io/) so that we can reference the `.pure-button` and `.pure-button-primary` rules.  The unreferenced rules in pure.css are discarded.

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
All the strategies and considerations detailed above should hold true when using `@import` inside the `@reference` block, and media-queries can be referenced or included if desired.

While other @import related plugins do not work well for use inside of the `@reference` block, use of them _outside_ of it should be unaffected.  Initial tests with `postcss-import` and ParcelJS's in-built `@import` functionality work just fine when they are the first node in the stylesheet.

## Usage

At present, [Postcss Reference] does not take any options.  That may be subject to change.
```js
postcss([ require('postcss-reference') ])
```

See [PostCSS](https://github.com/postcss/postcss) docs for examples for your environment.

## TODO's for the next release:

 - Adding logic for (or identifying a compatible plugin for) @importing remote resources; i.e. download and inject CSS from a URL
 - Handling nested reference block contents
