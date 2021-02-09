'use strict';

/*
This file contains the both the lexer and parser of ttt.
Lexer and parser created using Chevrotain:
https://sap.github.io/chevrotain/docs/
*/

let ttt_lang = (function(){

/*** LEXER ***/
// lexer should turn code into list of tokens
// see: https://sap.github.io/chevrotain/docs/tutorial/step1_lexing.html
let tokens = {
    // white-space, skipped in lexer result
    whiteSpace: chevrotain.createToken({
        name: 'whiteSpace',
        pattern: /\s+/,
        group: chevrotain.Lexer.SKIPPED,
    }),
    // single line comment, skipped in lexer result
    comment_single_line: chevrotain.createToken({
        name: 'comment_single_line',
        pattern: /\/\/.*/,
        group: chevrotain.Lexer.SKIPPED,
    }),
    // multiple line comment, skipped in lexer result
    comment_multiple_line: chevrotain.createToken({
        name: 'comment_multiple_line',
        pattern: /\/\*(\*(?!\/)|[^*])*\*\//,
        group: chevrotain.Lexer.SKIPPED,
        line_breaks: true,
    }),
};
// helper function
const define_token = (name, pattern) => tokens[name] = chevrotain.createToken({
    name: name,
    pattern: pattern || name,
});
// identifier token, 
const identifier = chevrotain.createToken({
    name: 'identifier',
    pattern: /[a-zA-Z_][a-zA-Z0-9_]*/,
});
// helper function
const define_keywd = (name) => tokens[name] = chevrotain.createToken({
    name: name,
    pattern: name,
    longer_alt: identifier,
});
// literal tokens
define_token('integer',         /0|[1-9]\d*/);
define_token('string_literal',  /"([^"\\]|\\.)*"/);

// operators
define_token('operator1',       /[\/%]/);
define_token('operator1b',       '*');
define_token('operator2',       /[+\-]/);
define_token('operator3',       /(<<|>>)/);
define_token('operator4',       '&');
define_token('operator5',       '^');
define_token('operator6',       '|');
define_token('operator7',       />=|<=|>(?![>])|<(?![<])/);
define_token('operator8',       /==|!=/);
define_token('operator9',       '&&');
define_token('operator10',      '||');
define_token('operator11',      /=/);

// other punctuators
define_token('comma',           ',');
define_token('semicolon',       ';');
define_token('round_open',      '(');
define_token('round_close',     ')');
define_token('square_open',     '[');
define_token('square_close',    ']');
define_token('curly_open',      '{');
define_token('curly_close',     '}');

// keywords
define_keywd('return');
define_keywd('if');
define_keywd('else');
define_keywd('while');
define_keywd('int');
define_keywd('char');

// actually create lexer
tokens['identifier'] = identifier;
define_token('unexpected',      /./);
let lexer = new chevrotain.Lexer(Object.values(tokens));


/*** PARSER ***/
// parser should turn list of tokens into ast (abstract syntax tree)
// see: https://sap.github.io/chevrotain/docs/tutorial/step2_parsing.html#introduction
class Parser extends chevrotain.EmbeddedActionsParser {
    constructor(tokens){
        // chevrotain init
        super(Object.values(tokens));
        this.tokens = tokens;
        const $ = this;

        /*
        rules
        $.RULE(rule-name, () => {
            ... some chevrotain parsing methods ...
                SUBRULE:    parse a subrule
                CONSUME:    consume a token
                MANY:       parse 0 or many pattern
                OR:         parse among choices, the first matching alternative is chosen
                sometimes the parsing methods are followed by a number (eg SUBRULE2)
                this is required by chevrotain, and do the same thing as if there is number
            return ast-of-the-rule;
        });
        */

        // program rule
        $.RULE('program', () => {
            let functions = [];
            $.MANY(() => {
                functions.push($.SUBRULE($.function));
            })
            return {
                functions: functions,
            };
        });

        // function rule
        $.RULE('function', () => {
            let return_type = $.SUBRULE($.type);
            let function_name = '$' + $.CONSUME(tokens.identifier).image;
            $.CONSUME(tokens.round_open);
            let params = [];
            $.MANY_SEP({
                SEP: tokens.comma,
                DEF: () => {
                    let type = $.SUBRULE2($.type);
                    let name = $.CONSUME2(tokens.identifier).image;
                    params.push({
                        type: type,
                        name: '$' + name,
                    });
                }
            });
            $.CONSUME(tokens.round_close);
            $.CONSUME(tokens.curly_open);
            let body = $.SUBRULE($.statements);
            $.CONSUME(tokens.curly_close);
            return {
                return_type: return_type,
                function_name: function_name,
                params: params,
                body: body,
            };
        });

        // type rule
        $.RULE('type', () => {
            let basic_type = null;
            let pointer_count = 0;
            $.OR([
                { ALT: () => { basic_type = $.CONSUME(tokens.int).image; }},
                { ALT: () => { basic_type = $.CONSUME(tokens.char).image; }},
            ]);
            $.MANY(() => {
                $.CONSUME(tokens.operator1b);
                pointer_count++;
            });
            return {
                basic_type: basic_type,
                pointer_count: pointer_count,
            };
        });

        // statements rule
        $.RULE('statements', () => {
            let statements = [];
            $.MANY(() => {
                $.OR([
                    { ALT: () => { statements.push($.SUBRULE($.declare_statement)); }},
                    { ALT: () => { statements.push($.SUBRULE($.expression_statement)); }},
                    { ALT: () => { statements.push($.SUBRULE($.return_statement)); }},
                    { ALT: () => { statements.push($.SUBRULE($.if_statement)); }},
                    { ALT: () => { statements.push($.SUBRULE($.while_statement)); }},
                ]);
            });
            return statements;
        });

        // declare statement rule
        $.RULE('declare_statement', () => {
            let type = $.SUBRULE($.type);
            let var_name = '$' + $.CONSUME(tokens.identifier).image;
            $.CONSUME(tokens.semicolon);
            return {
                statement: 'declare',
                type: type,
                var_name: var_name,
            };
        });

        // expression statement rule
        $.RULE('expression_statement', () => {
            let expression = $.SUBRULE($.expression);
            $.CONSUME(tokens.semicolon);
            return {
                statement: 'expression',
                expression: expression,
            };
        });

        // return statement rule
        $.RULE('return_statement', () => {
            $.CONSUME(tokens.return);
            let expression = $.SUBRULE($.expression);
            $.CONSUME(tokens.semicolon);
            return {
                statement: 'return',
                expression: expression,
            };
        });

        // if statement rule
        $.RULE('if_statement', () => {
            let conditions = [];
            let bodies = [];
                $.CONSUME1(tokens.if);
                $.CONSUME1(tokens.round_open);
                conditions.push($.SUBRULE1($.expression));
                $.CONSUME1(tokens.round_close);
                $.CONSUME1(tokens.curly_open);
                bodies.push($.SUBRULE1($.statements));
                $.CONSUME1(tokens.curly_close);
            $.MANY(() => {
                $.CONSUME2(tokens.else);
                $.CONSUME2(tokens.if);
                $.CONSUME2(tokens.round_open);
                conditions.push($.SUBRULE2($.expression));
                $.CONSUME2(tokens.round_close);
                $.CONSUME2(tokens.curly_open);
                bodies.push($.SUBRULE2($.statements));
                $.CONSUME2(tokens.curly_close);
            });
            $.OPTION(() => {
                $.CONSUME3(tokens.else);
                $.CONSUME3(tokens.curly_open);
                bodies.push($.SUBRULE3($.statements));
                $.CONSUME3(tokens.curly_close);
            });
            return {
                statement: 'if',
                conditions: conditions,
                bodies: bodies,
            };
        });

        // while statement rule
        $.RULE('while_statement', () => {
            $.CONSUME(tokens.while);
            $.CONSUME(tokens.round_open);
            let condition = $.SUBRULE($.expression);
            $.CONSUME(tokens.round_close);
            $.CONSUME(tokens.curly_open);
            let body = $.SUBRULE($.statements);
            $.CONSUME(tokens.curly_close);
            return {
                statement: 'while',
                condition: condition,
                body: body,
            };
        });

        // expression rules
        // consider a simple example: parsing expression with + and *
        // eg. 1 + 2 * 3 + 4
        // we expect parsed into 1 + (2*3) + 4
        // in order to achieve this goal, we introduce the concept of expression_add and expression_multiple
        //   expression_add      := expression_multiple MANY('+' expression_multiple)
        //   expression_multiple := number MANY('*' number)
        // The following for loop generate the expression rules family:
        //   expression[n] := expression[n-1] MANY(operator[n-1] expression[n-1])
        for (let i = 11; i >= 2; i--) eval(`
        $.RULE('expression${i == 11 ? '' : i+1}', () => {
            let operands = [];
            let operators = [];
            operands.push($.SUBRULE1($.expression${i}));
            $.MANY(() => {
                operators.push($.CONSUME(tokens.operator${i}).image);
                operands.push($.SUBRULE2($.expression${i}));
            });
            // if there is no operator of this level
            // directly return the only operand instead of creating a useless intermediate node in AST
            if (operands.length == 1) return operands[0];
            return {
                operands: operands,
                operators: operators,
            };
        });
        `);
        // sepcial treatment for expression2, as it involves operator1 and operator1b
        $.RULE('expression2', () => {
            let operands = [];
            let operators = [];
            operands.push($.SUBRULE1($.expression1));
            $.MANY(() => {
                $.OR([
                    { ALT: () => {operators.push($.CONSUME(tokens.operator1).image);}},
                    { ALT: () => {operators.push($.CONSUME(tokens.operator1b).image);}},
                ]);
                operands.push($.SUBRULE2($.expression1));
            });
            if (operands.length == 1) return operands[0];
            return {
                operands: operands,
                operators: operators,
            };
        });
        // special treatment for expression1, as ()/[] are postfix operators instead of infix operator
        $.RULE('expression1', () => {
            let operands = [];
            let operators = [];
            operands.push($.SUBRULE($.expression0));
            $.MANY(() => {
                $.OR([
                    { ALT: () => {
                        operators.push($.CONSUME(tokens.round_open).image);
                        let args = [];
                        $.MANY_SEP({
                            SEP: tokens.comma,
                            DEF: () => { args.push($.SUBRULE2($.expression)); },
                        });
                        operands.push(args);
                        $.CONSUME(tokens.round_close);
                    }},
                    { ALT: () => {
                        operators.push($.CONSUME(tokens.square_open).image);
                        operands.push($.SUBRULE3($.expression));
                        $.CONSUME(tokens.square_close);
                    }},
                ]);
            });
            if (operands.length == 1) return operands[0];
            return {
                operands: operands,
                operators: operators,
            };
        });
        // expression0 is in fact single item of identifier/integer/string literal
        $.RULE('expression0', () => {
            let result = null;
            $.OR([
                { ALT: () => {
                    $.CONSUME(tokens.round_open);
                    result = $.SUBRULE($.expression);
                    $.CONSUME(tokens.round_close);
                }},
                { ALT: () => { result = '$' + $.CONSUME(tokens.identifier).image; }},
                { ALT: () => { result = $.CONSUME(tokens.integer).image; }},
                { ALT: () => {
                    let temp = $.CONSUME(tokens.string_literal).image;
                    $.ACTION(() => { result = '"' + JSON.parse(temp); });
                }},
            ]);
            return result;
        });

        // chevrotain init
        this.performSelfAnalysis();
    }
}

// export
return {
    tokens: tokens,
    lexer: lexer,
    Parser: Parser,
};

})();