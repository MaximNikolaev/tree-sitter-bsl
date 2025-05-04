/**
 * @file 1C:Enterprise language (BSL) grammar for tree-sitter
 * @author Maxim Nikolaev <max.nikolaev.dev@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "bsl",

  rules: {
    // TODO: add the actual grammar rules
    source_file: $ => "hello"
  }
});
