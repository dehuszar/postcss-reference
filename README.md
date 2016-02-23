# PostCSS Reference [![Build Status][ci-img]][ci]

[PostCSS](https://github.com/postcss/postcss) plugin for referencing selectors' rules from CSS files and defined rulesets.  Will not output rules unless directly referenced in your stylesheet.  Concept follows LESS's [@import (reference) 'filename'](http://lesscss.org/features/#import-options-reference) functionality but with slightly different syntax and usage.  The goal for the plugin is to allow for the kinds of advanced usage of LESS's `@extend` and `@import(reference)` methods as outlined in [this article on Semantic Remapping](https://medium.com/@dehuszar/semantic-remapping-with-css-pre-processors-906ba1a9910c) for PostCSS.  The Plugin can currently replicate [most examples for this article](http://codepen.io/collection/DoEGWB/).

[PostCSS]: https://github.com/postcss/postcss
[ci-img]:  https://travis-ci.org/dehuszar/postcss-reference.svg
[ci]:      https://travis-ci.org/dehuszar/postcss-reference



## Basic syntax:

Rules placed in the `@reference` block are mapped to a comparison array and discarded from the AST.  Rules from your style sheet which then use an `@references selectorName;` declaration will have their requested selector compared against the rules in your comparison array.  All instances of `@references` *have* to be declarations.  A `selector:reference(.reference-target) { /* declarations */ }` syntax similar to LESS's extend pseudo-class is forthcoming.  Matching rules from the `@reference` block will then have their declarations merged into your requesting rules' declarations where the originating `@references selectorName;` request was made.


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

    header-alt {
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

Note that `header-alt` and `.widget header` are ignored as those rules are not an exact match, pseudo-class, sibling, or descendant of the requesting rule.


## Using `@import`:

(example assumes you have [postcss-import](https://github.com/postcss/postcss-import) installed and configured properly)
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
## Media Queries

Additionally, [Postcss Reference] can read rules from inside media queries.  At present, items can be referenced across matching media queries, or if a non-media-query wrapped rule references a selector with the 'all' flag, and the requested reference rules have matches wrapped in any media queries.  For example:

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

Referencing a selector that has no media query, when the requesting selector is in a media query will yield a match when the `@references` request is wrapped with an `@references-media` at Rule with no params

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

Referencing a selector that has a media query, when the requesting selector is in a different media query will yield a match when the `@references` request is wrapped with an `@references-media` at Rule with the target media query as a parameter
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

[PostCSS Reference] has also been tested for use with [PostCSS Nested](https://github.com/postcss/postcss-nested) to allow for referencing nested rules like so:

```css
@references {
    @import "pure.css";
    @import "grids-responsive.css"; /* also part of the PureCSS library */

    .layout-article-full {
        @references .pure-g all;

        /* mobile-first layout*/
        [role="main"],
        [role="main"] > article,
        [role="complementary"] > section {
            @references .pure-u-1-1 all;

            + * {
                margin: 2.2vh 0 0 0;
            }
        }

        /* tablet/portrait layout */
        [role="complementary"] > section {
            @references .pure-u-sm-1-2 all;
        }

        /* desktop layout*/
        [role="main"] {
            @references .pure-u-xl-3-4 all;
        }

        [role="complementary"] {
            @references .pure-u-xl-1-4 all;
        }
    }
}

.content-wrapper {
    @references .layout-article-full all;
}
```

would yield output like the following:

```css
    .content-wrapper {
        /* .pure-g declarations and rules would go here -- ignoring for brevity */
    }

    .content-wrapper [role="main"],
    .content-wrapper [role="main"] > article,
    .content-wrapper [role="complementary"] > section {
        display: inline-block;
        *display: inline;
        zoom: 1;
        letter-spacing: normal;
        word-spacing: normal;
        vertical-align: top;
        text-rendering: auto;
        width: 50%;
        *width: 49.9690%;
    }

    /*...etc...*/
```

Note that the `.layout-article-full` class has been remapped to .content-wrapper, and all related matches use the selector of the requesting rule.  Also note, that the `@reference` block itself has `@references` declarations which also get resolved.  The above abstraction would work the same if the `.layout-article-full` nested rule set was moved to an external style sheet and imported like so:

```css
@references {
    @import "pure.css";
    @import "grids-responsive.css";
    @import "layout-article-full.css"
}
```

So long as the rules being referenced come before the rule whose `@references` declaration is making the request; i.e. put your dependencies first.  This allows for very powerful CSS component abstractions.

## Usage

At present, [Postcss Reference] does not take any options.  That may be subject to change.
```js
postcss([ require('postcss-reference') ])
```

See [PostCSS](https://github.com/postcss/postcss) docs for examples for your environment.

To get the best results out [PostCSS Reference], I recommend the following plugin combination:

```js
postcss()
    .use(atImport()) // postcss-import
    .use(nested()) // postcss-nested
    .use(reference()) // this esteemed plugin
    .use(mqPacker()) // css-mqpacker
    .use(removePrefixes()) // postcss-remove-prefixes
    .use(cssnano()) // cssnano
    .process(/* do your business */);
```

[postcss-import](https://github.com/postcss/postcss-import) and [PostCSS Nested](https://github.com/postcss/postcss-nested) are well covered above, so I won't go into further detail here.

The inclusion of [CSS MQPacker](https://github.com/hail2u/node-css-mqpacker) is largely because [PostCSS Reference] does not attempt to optimize media-query matches and will return them as they are referenced.  Having too many media-queries in your CSS can increase the parse time of your style sheet by the browser.  On the other hand, writing your CSS so that there's only a single media-query for each breakpoint, screen type, or orientation combo, severely limits the ability to make composable component abstractions.  This plugin gives you the best of both.

If you are importing libraries such as Bootstrap, Pure, or Foundation, you will already have a _lot_ of vendor prefixes, and those libraries get updated less frequently than the caniuse database.  Stripping them all out and letting autoprefixer or cssnano inject only what constitutes the latest best practices, or your preferred configuration will give you more precise control over the output.  For this I've been using [postcss-remove-prefixes](https://github.com/johnotander/postcss-remove-prefixes) to great effect.

[cssnano](http://cssnano.co/) provides a very thorough optimization pass over your CSS output.  [PostCSS Reference] doesn't try too hard to figure out intent when there are duplicate declarations coming from different referenced rules.  Also when a nested rule's parent has no declarations, you will often see empty rules in your output.  cssnano is a great way to clean up the cruft.  If cssnano is too heavy for your tastes, I would recommend at least using the following plugins for cleanup that you might need for CSS output by [PostCSS Reference]:

- [postcss-discard-duplicates](https://github.com/ben-eb/postcss-discard-duplicates)
- [postcss-discard-empty](https://github.com/ben-eb/postcss-discard-empty)
- [postcss-discard-unused](https://github.com/ben-eb/postcss-discard-unused)
- [postcss-merge-rules](https://github.com/ben-eb/postcss-merge-rules)
- [postcss-unique-selectors](https://github.com/ben-eb/postcss-unique-selectors)

cssnano might be easier.  ;-)

## TODO's for the next release:

 - Updating to work with latest version of postcss-import (currently only works up to v7.x)
 - Source-mapping references
