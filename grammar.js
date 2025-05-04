/**
 * @file 1C:Enterprise language (BSL) grammar for tree-sitter
 * @author Maxim Nikolaev <max.nikolaev.dev@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

//#region Constants

const keyword   = keywords();
const operator  = operators();
const char      = chars();

const PREC = {
  COMMENT: 0,
  PREPROCESSOR: 1,
  ASSIGNMENT: 3,
  BOOLEAN_OR: 4,
  BOOLEAN_AND: 5,
  BOOLEAN_NOT: 6,
  COMPARISON: 9,
  ADDITION: 10,
  SUBTRACTION: 10,
  MULTIPLICATION: 11,
  DIVISION: 11,
  UNARY: 12,
  PARENTHESES: 20,
  PROPERTY_ACCESS: 30,
}

//#endregion Constants

module.exports = grammar({

  name: "bsl",

  //#region Rules

  rules: {

    source_file: $ => seq(
      repeat($.module_variable_definition),
      repeat(choice(
        $.procedure_definition,
        $.function_definition,
        $.method_annotation, // TODO
      ),),
      repeat($._statement),
    ),

    module_variable_definition: $ => seq(
      keyword.var,
      $.identifier,
      optional(keyword.export),
      repeat(seq(char.comma, seq(
        $.identifier, // TODO Export keyword is a keyword, but may mistakenly be used here as an identifier
        optional(keyword.export)))),
      char.semi,
    ),

    local_variable_definition: $ => seq(
      keyword.var,
      $.identifier,
      repeat(seq(char.comma, seq(
        $.identifier,))), // TODO Export keyword is a keyword, but may mistakenly be used here as an identifier
      char.semi,
    ),

    procedure_definition: $ => seq(
      field('is_async', optional(alias(keyword.async, 'async'))),
      keyword.procedure,
      field('identifier', $.identifier),
      $.parameters_list,
      field('is_export', optional(alias(keyword.export, 'export'))),
      repeat($.local_variable_definition),
      repeat($._statement),
      keyword.endprocedure,
    ),

    function_definition: $ => seq(
      field('is_async', optional(alias(keyword.async, 'async'))),
      keyword.function,
      $.identifier,
      $.parameters_list,
      field('is_export', optional(alias(keyword.export, 'export'))),
      repeat($.local_variable_definition),
      repeat($._statement),
      keyword.endfunction,
    ),

    parameters_list: $ => seq(
      char.lpar,
      optional($.parameter),
      repeat(
        seq(
          char.comma,
          $.parameter,
        ),
      ),
      char.rpar,
    ),

    parameter: $ =>
      seq(
        optional(keyword.val),
        $.identifier,
        optional(
          seq(
            operator.assignment,
            choice( // TODO union to some constant_value
              $.null_literal,
              $.true_literal,
              $.false_literal,
              $.date_literal,
              $.undefined_literal,
              $.string_literal,
              $.number,
            ),
          )
        ),
      ),

    // Statements
    _statement: $ => prec.left(60,
      choice(
        $.return_statement,
        $.method_call_statement,
        $.if_statement,
        $.for_loop_statement,
        $.for_each_loop_statement,
        $.while_loop_statement,
        $.assignment_statement,
        $.try_statement,
        $.raise_exception_statement,
        $.break_statement,
        $.continue_statement,)
    ),

    assignment_statement: $ =>
      prec.left(PREC.ASSIGNMENT,
        seq(
          choice($.identifier, $.property_dot_access, $.property_bracket_access), // TODO
          operator.assignment,
          $._expression,
          char.semi,
        )
      ),

    return_statement: $ => seq(
      keyword.return,
      optional($._expression),
      char.semi,
    ),

    if_statement: $ =>
      seq(
        keyword.if,
        $._expression,
        keyword.then,
        repeat($._statement),
        repeat(
          seq(
            keyword.elsif,
            $._expression,
            keyword.then,
            repeat($._statement),
          ),
        ),
        optional(
          seq(
            keyword.else,
            repeat($._statement),
          )
        ),
        keyword.endif,
        char.semi,
      ),

    for_loop_statement: $ =>
      seq(
        keyword.for,
        seq(
          $.identifier,
          operator.assignment,
          $.number, // TODO does not work with '-1'
        ),
        keyword.to,
        $._expression,
        keyword.do,
        repeat($._statement),
        keyword.enddo,
        char.semi,
      ),

    for_each_loop_statement: $ =>
      seq(
        keyword.for,
        keyword.each,
        $.identifier,
        keyword.in,
        $._expression,
        keyword.do,
        repeat(
          choice(
            $._statement,
            $.break_statement,
            $.continue_statement,
          )
        ),
        keyword.enddo,
        char.semi,
      ),

    while_loop_statement: $ =>
      seq(
        keyword.while,
        $._expression,
        keyword.do,
        repeat(
          choice(
            $._statement,
            $.break_statement,
            $.continue_statement,
          )
        ),
        keyword.enddo,
        char.semi,
      ),

    break_statement: $ =>
      prec.left(51,
        seq(
          keyword.break,
          char.semi,
        )
      ),

    continue_statement: $ =>
      prec.left(51,
        seq(
          keyword.continue,
          char.semi,
        )
      ),

    try_statement: $ =>
      seq(
        keyword.try,
        repeat($._statement),
        keyword.except,
        repeat($._statement),
        keyword.endtry,
        char.semi,
      ),

    raise_exception_statement: $ =>
      seq(
        keyword.raise,
        optional($._expression),
        char.semi,
      ),

    _access: $ =>
      prec.left(51,
        choice(
          $.property_dot_access,
          $.property_bracket_access,
          $.method_call_access,
          $.method_call_expression,
        )
      ),

    property_dot_access: $ =>
      prec(PREC.PROPERTY_ACCESS,
        seq(
          choice($._access, $.identifier),
          char.period,
          $.identifier,
        )
      ),

    property_bracket_access: $ =>
      prec(PREC.PROPERTY_ACCESS,
        seq(
          choice($._access, $.identifier),
          char.lbrack,
          $._expression,
          char.rbrack,
        )
      ),

    method_call_statement: $ =>
      prec.left(4,
        seq(
          choice($.method_call_expression, $.method_call_access),
          char.semi,
        )
      ),

    method_call_access: $ =>
      prec.left(50, // TODO what's the predecence?
        seq(
          choice($._access, $.identifier),
          char.period,
          $.method_call_expression,
        ),
      ),

    method_call_expression: $ =>
      prec.left(PREC.PROPERTY_ACCESS, // TODO what's the predecence?
        seq(
          $.identifier,
          $.method_arguments,
        ),
      ),

    method_arguments: $ => // TODO check this
      seq(
        char.lpar,
        optional($._expression),
        repeat(
          seq(
            char.comma,
            optional($._expression),
          )
        ),
        char.rpar,
      ),

    _expression: $ =>
      choice(
        $._parenthesized_expression,
        $._arithmetic_operations,
        $._logical_operations,
        $.calculatebycondition_expression,
        $.new_expression,
        $._access,
        $.method_call_access,
        $.method_call_expression,
        $.null_literal,
        $.true_literal,
        $.false_literal,
        $.date_literal,
        $.undefined_literal,
        $.string_literal,
        $.number,
        $.identifier,
      ),

    _parenthesized_expression: $ =>
      prec.left(PREC.PARENTHESES,
        seq(
          char.lpar,
          $._expression,
          char.rpar,
        )
      ),

    new_expression: $ => // TODO
      seq(
        keyword.new,
        $.identifier,
        optional($.arguments_list), // TODO
      ),

    arguments_list: $ => seq( // TODO see if duplicated method_arguments
      char.lpar,
      optional($._expression),
      repeat(
        seq(
          char.comma,
          optional($._expression),
        ),
      ),
      char.rpar,
    ),

    _arithmetic_operations: $ =>
      choice(
        $.addition_operation,
        $.subtraction_operation,
        $.multiplication_operation,
        $.division_operation,
        $.residueofdivision_operation,
        $.unaryplus_operation,
        $.unaryminus_operation,
      ),

    addition_operation: $ =>
      prec.left(PREC.ADDITION,
        seq(
          $._expression,
          operator.addition,
          $._expression,
        )
      ),

    subtraction_operation: $ =>
      prec.left(PREC.SUBTRACTION,
        seq(
          $._expression,
          operator.subtraction,
          $._expression,
        )
      ),

    multiplication_operation: $ =>
      prec.left(PREC.MULTIPLICATION,
        seq(
          $._expression,
          operator.multiplication,
          $._expression,
        )
      ),

    division_operation: $ =>
      prec.left(PREC.DIVISION,
        seq(
          $._expression,
          operator.division,
          $._expression,
        )
      ),

    residueofdivision_operation: $ =>
      prec.left(PREC.DIVISION,
        seq(
          $._expression,
          operator.residueofdivision,
          $._expression,
        )
      ),

    unaryplus_operation: $ => // note: not present in specification
      prec.left(PREC.UNARY,
        seq(
          operator.unaryplus,
          $._expression,
        )
      ),

    unaryminus_operation: $ =>
      prec.left(PREC.UNARY,
        seq(
          operator.unaryminus,
          $._expression,
        )
      ),

    // TODO
    //concatenation_operation: $ =>
    //    seq(
    //      $._expression,
    //      char.plus,
    //      $._expression,
    //    ),

    // Logical operations

    _logical_operations: $ =>
      choice(
        $._comparison_operations,
        $._boolean_operations,
      ),

    _comparison_operations: $ =>
      choice(
        $.compare_morethan_operation,
        $.compare_moreorequal_operation,
        $.compare_lessthan_operation,
        $.compare_lessorequal_operation,
        $.compare_equal_operation,
        $.compare_notequal_operation,
      ),

    _boolean_operations: $ =>
      choice(
        $.or_operation,
        $.and_operation,
        $.not_operation,
      ),

    compare_morethan_operation: $ =>
      prec.left(PREC.COMPARISON,
        seq(
          $._expression,
          operator.morethan,
          $._expression,
        )
      ),

    compare_moreorequal_operation: $ =>
      prec.left(PREC.COMPARISON,
        seq(
          $._expression,
          operator.moreorequal,
          $._expression,
        )
      ),

    compare_lessthan_operation: $ =>
      prec.left(PREC.COMPARISON,
        seq(
          $._expression,
          operator.lessthan,
          $._expression,
        )
      ),

    compare_lessorequal_operation: $ =>
      prec.left(PREC.COMPARISON,
        seq(
          $._expression,
          operator.lessorequal,
          $._expression,
        )
      ),

    compare_equal_operation: $ =>
      prec.left(PREC.COMPARISON,
        seq(
          $._expression,
          operator.equal,
          $._expression,
        )
      ),

    compare_notequal_operation: $ =>
      prec.left(PREC.COMPARISON,
        seq(
          $._expression,
          operator.notequal,
          $._expression,
        )
      ),

    or_operation: $ =>
      prec.left(PREC.BOOLEAN_OR,
        seq(
          $._expression,
          operator.or,
          $._expression,
        )
      ),

    and_operation: $ =>
      prec.left(PREC.BOOLEAN_AND,
        seq(
          $._expression,
          operator.and,
          $._expression,
        )
      ),

    not_operation: $ =>
      prec.left(PREC.BOOLEAN_NOT,
        seq(
          operator.not,
          $._expression,
        )
      ),

    calculatebycondition_expression: $ =>
      seq(
        char.quest,
        char.lpar,
        $._expression,
        char.comma,
        $._expression,
        char.comma,
        $._expression,
        char.rpar,
      ),

    null_literal: $ => keyword.null,

    true_literal: $ => keyword.true,

    false_literal: $ => keyword.false,

    date_literal: $ =>
      seq(
        char.apos,
        alias(/(?:[^\r\n\u0027])*/, 'regexp'), // TODO
        char.apos,
      ),

    undefined_literal: $ => keyword.undefined,

    string_literal: $ => // TODO const?
      seq(
        '"',
        alias(/(?:[^\r\n\u0022]|(\u0022\u0022)|(?:\n*\s*\u007C))*/, 'regexp'),
        '"',
      ),

    identifier: $ => new RustRegex('[a-zA-Zа-яёА-ЯЁ_][a-zA-Zа-яёА-ЯЁ0-9_]*'),

    number: $ => /\d+(\.\d+)?/, // TODO new RustRegex('(?iu)\d+(\.\d+)?'), // TODO const?

    line_comment: $ => token(prec(PREC.COMMENT, seq('//', /[^\r\n\u2028\u2029]*/))), // TODO

    preprocessor_instruction: $ => token(seq('#', /[^\r\n\u2028\u2029]*/)), // TODO

    method_annotation: $ => token(seq('&', /[^\r\n\u2028\u2029]*/)), // TODO

  },

  //#endregion Rules

  extras: $ => [
    $.line_comment,
    /[\s\f\uFEFF\u2060\u200B]|\r?\n/, // TODO simplify. change multiline comments to a single block
    $.preprocessor_instruction, // TODO does not work in ListSelect.Add("##(99999) 999-99-99", StringFunctions.FormattedString(MaskNumbers));
  ],

  word: $ => $.identifier,

});

//#region Keywords and symbols

function keywords() {

  const keywordsPatterns = {}

  // See https://its.1c.ru/db/v8327doc#bookmark:dev:TI000000138 (4.2.4.6. Зарезервированные слова)
  const reserved_keywords = {
    if:           {en: 'If',            ru: 'Если'},
    then:         {en: 'Then',          ru: 'Тогда'},
    elsif:        {en: 'ElsIf',         ru: 'ИначеЕсли'},
    else:         {en: 'Else',          ru: 'Иначе'},
    endif:        {en: 'EndIf',         ru: 'КонецЕсли'},
    for:          {en: 'For',           ru: 'Для'},
    each:         {en: 'Each',          ru: 'Каждого'},
    in:           {en: 'In',            ru: 'Из'},
    to:           {en: 'To',            ru: 'По'},
    while:        {en: 'While',         ru: 'Пока'},
    do:           {en: 'Do',            ru: 'Цикл'},
    enddo:        {en: 'EndDo',         ru: 'КонецЦикла'},
    procedure:    {en: 'Procedure',     ru: 'Процедура'},
    function:     {en: 'Function',      ru: 'Функция'},
    endprocedure: {en: 'EndProcedure',  ru: 'КонецПроцедуры'},
    endfunction:  {en: 'EndFunction',   ru: 'КонецФункции'},
    var:          {en: 'Var',           ru: 'Перем'},
    goto:         {en: 'Goto',          ru: 'Перейти'},
    return:       {en: 'Return',        ru: 'Возврат'},
    continue:     {en: 'Continue',      ru: 'Продолжить'},
    break:        {en: 'Break',         ru: 'Прервать'},
    and:          {en: 'And',           ru: 'И'},
    or:           {en: 'Or',            ru: 'Или'},
    not:          {en: 'Not',           ru: 'Не'},
    try:          {en: 'Try',           ru: 'Попытка'},
    except:       {en: 'Except',        ru: 'Исключение'},
    raise:        {en: 'Raise',         ru: 'ВызватьИсключение'},
    endtry:       {en: 'EndTry',        ru: 'КонецПопытки'},
    new:          {en: 'New',           ru: 'Новый'},
    execute:      {en: 'Execute',       ru: 'Выполнить'},
  }

  const other_keywords = {
    async:        {en: 'Async',         ru: 'Асинх'},
    export:       {en: 'Export',        ru: 'Экспорт'},
    val:          {en: 'Val',           ru: 'Знач'},
  }

  const literals = {
    null:         {en: 'NULL',          ru: 'NULL'},
    true:         {en: 'True',          ru: 'Истина'},
    false:        {en: 'False',         ru: 'Ложь'},
    undefined:    {en: 'Undefined',     ru: 'Неопределено'},
  }

  for (var key in reserved_keywords) {
    // Transforming to regexp with case incensitive expression
    keywordsPatterns[key] = new RustRegex(`(?iu)(${reserved_keywords[key].en})|(${reserved_keywords[key].ru})`);
  }

  for (var key in other_keywords) {
    // Transforming to regexp with case incensitive expression
    keywordsPatterns[key] = new RustRegex(`(?iu)(${other_keywords[key].en})|(${other_keywords[key].ru})`);
  }

  for (var key in literals) {
    // Transforming to regexp with case incensitive expression
    keywordsPatterns[key] = new RustRegex(`(?iu)(${literals[key].en})|(${literals[key].ru})`);
  }

  return keywordsPatterns;
  
}

function operators() {

  const operatorsPatterns = {}

  const operators = {
    and:  {en: 'And',  ru: 'И'},
    or:   {en: 'Or',   ru: 'Или'},
    not:  {en: 'Not',  ru: 'Не'},
  }

  for (var key in operators) {
    // Transforming to regexp with case incensitive expression
    operatorsPatterns[key] = new RustRegex(`(?iu)(${operators[key].en})|(${operators[key].ru})`);
  }

  operatorsPatterns['assignment']         = '=';

  operatorsPatterns['addition']           = '+';
  operatorsPatterns['subtraction']        = '-';
  operatorsPatterns['multiplication']     = '*';
  operatorsPatterns['division']           = '/';
  operatorsPatterns['residueofdivision']  = '%';

  operatorsPatterns['morethan']           = '>';
  operatorsPatterns['moreorequal']        = '>=';
  operatorsPatterns['lessthan']           = '<';
  operatorsPatterns['lessorequal']        = '<=';
  operatorsPatterns['equal']              = '=';
  operatorsPatterns['notequal']           = '<>';

  operatorsPatterns['unaryplus']          = '+';
  operatorsPatterns['unaryminus']         = '-';

  operatorsPatterns['new']                = keywords().new;

  return operatorsPatterns;

}

function chars() {

  const chars = {
    semi:   ';',
    comma:  ',',
    period: '.',
    lpar:   '(',
    rpar:   ')',
    lbrack: '[',
    rbrack: ']',
    quest:  '?',
    apos:   "'",
  }

  return chars;

}

//#endregion Keywords and symbols
