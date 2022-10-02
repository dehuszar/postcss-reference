## PostCSS Reference v2.0.0 (Oct 2, 2022)
New features
 - Total rewrite to utilize current PostCSS API (8.4.17), and support most recent import (14.0.0) and nested (5.0.6) plugins

Breaking changes
 - removing support for `selector:references(ref)` remapping

## PostCSS Reference v1.0.3 (Feb 20, 2016)
New features
 - Introduction of `@references-media` AtRule for cross-query matching
 - Implementation of `:references()` pseudoclass, mimicking LESS's :extend() functionality

Fixed
 - bug where comma separated references weren't being properly caught if the scope was "all" and the referenced rule was in a media query, but the requesting rule was not

## PostCSS Reference v1.0.2 (Nov 4, 2015)
Further updates as I realize npm's description heading has a character limit

## PostCSS Reference v1.0.1 (Nov 4, 2015)
Updating docs and package descriptions

## PostCSS Reference v1.0.0 (Nov 4, 2015)
First official release brings
 - the ability to define and import styles for reuse and referencing across a style sheet.
 - the ability to set an 'all' flag to match relative selectors (i.e. `@references th all;` will match 'th', 'th > h1', etc., but not 'thead' or 'table th'), pseudo-classes, and media-queries, and
 - match rules from the same media query, or with the 'all' flag set allow a non-media-query wrapped selector reference every media query the selector might have a match in.
