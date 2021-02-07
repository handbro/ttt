'use strict';

/*
This file contains the compiler of ttt.
It compiles ast into COM file, which is an executable format with x86 (16bit) instruction.
COM file contents are read into address 0x0100, and start execution at 0x0100
*/

let ttt_com_compiler = (function(){

// helper function, turn js integer into imm8 (immediate asm integer literal of 8 bit)
function imm8(imm){
    return [imm & 0xff];
}

// helper function, turn js integer into imm16
function imm16(imm){
    return [imm & 0xff, (imm >> 8) & 0xff];
}

// asm helper function
function asm(inst, _1, _2){
    if (inst == 'mov_imm'){ // imm to reg
        if (_1 == 'ax') return [0xb8, ...imm16(_2)];
        if (_1 == 'bx') return [0xbb, ...imm16(_2)];
        if (_1 == 'cx') return [0xb9, ...imm16(_2)];
        if (_1 == 'dx') return [0xba, ...imm16(_2)];
        if (_1 == 'bp') return [0xbd, ...imm16(_2)];
        if (_1 == 'sp') return [0xbc, ...imm16(_2)];
    }
    if (inst == 'mov_mem'){ // WORD PTR mem to reg
        if (_1 == 'ax') return [0xa1,       ...imm16(_2)];
        if (_1 == 'bx') return [0x8b, 0x1e, ...imm16(_2)];
        if (_1 == 'cx') return [0x8b, 0x0e, ...imm16(_2)];
        if (_1 == 'dx') return [0x8b, 0x16, ...imm16(_2)];
        if (_1 == 'bp') return [0x8b, 0x2e, ...imm16(_2)];
        if (_1 == 'sp') return [0x8b, 0x26, ...imm16(_2)];
    }
    if (inst == 'mov_reg'){ // reg to WORD PTR mem
        if (_1 == 'ax') return [0xa3,       ...imm16(_2)];
        if (_1 == 'bx') return [0x89, 0x1e, ...imm16(_2)];
        if (_1 == 'cx') return [0x89, 0x0e, ...imm16(_2)];
        if (_1 == 'dx') return [0x89, 0x16, ...imm16(_2)];
        if (_1 == 'bp') return [0x89, 0x2e, ...imm16(_2)];
        if (_1 == 'sp') return [0x89, 0x26, ...imm16(_2)];
    }
    if (inst == 'mov_word_bp'){ // WORD PTR [bp+idx] to reg
        if (-0x80 <= _2 && _2 <= 0x7f){
            if (_1 == 'ax') return [0x8b, 0x46, ...imm8(_2)];
            if (_1 == 'bx') return [0x8b, 0x5e, ...imm8(_2)];
            if (_1 == 'cx') return [0x8b, 0x4e, ...imm8(_2)];
            if (_1 == 'dx') return [0x8b, 0x56, ...imm8(_2)];
            if (_1 == 'bp') return [0x8b, 0x6e, ...imm8(_2)];
            if (_1 == 'sp') return [0x8b, 0x66, ...imm8(_2)];
        }else{
            if (_1 == 'ax') return [0x8b, 0x86, ...imm16(_2)];
            if (_1 == 'bx') return [0x8b, 0x9e, ...imm16(_2)];
            if (_1 == 'cx') return [0x8b, 0x8e, ...imm16(_2)];
            if (_1 == 'dx') return [0x8b, 0x96, ...imm16(_2)];
            if (_1 == 'bp') return [0x8b, 0xae, ...imm16(_2)];
            if (_1 == 'sp') return [0x8b, 0xa6, ...imm16(_2)];
        }
    }
    if (inst == 'mov_reg_bp'){ // reg to WORD PTR [bp+idx]
        if (-0x80 <= _2 && _2 <= 0x7f){
            if (_1 == 'ax') return [0x89, 0x46, ...imm8(_2)];
            if (_1 == 'bx') return [0x89, 0x5e, ...imm8(_2)];
            if (_1 == 'cx') return [0x89, 0x4e, ...imm8(_2)];
            if (_1 == 'dx') return [0x89, 0x56, ...imm8(_2)];
            if (_1 == 'bp') return [0x89, 0x6e, ...imm8(_2)];
            if (_1 == 'sp') return [0x89, 0x66, ...imm8(_2)];
        }else{
            if (_1 == 'ax') return [0x89, 0x86, ...imm16(_2)];
            if (_1 == 'bx') return [0x89, 0x9e, ...imm16(_2)];
            if (_1 == 'cx') return [0x89, 0x8e, ...imm16(_2)];
            if (_1 == 'dx') return [0x89, 0x96, ...imm16(_2)];
            if (_1 == 'bp') return [0x89, 0xae, ...imm16(_2)];
            if (_1 == 'sp') return [0x89, 0xa6, ...imm16(_2)];
        }
    }
    if (inst == 'push_reg'){
        if (_1 == 'ax') return [0x50];
        if (_1 == 'bx') return [0x53];
        if (_1 == 'cx') return [0x51];
        if (_1 == 'dx') return [0x52];
        if (_1 == 'bp') return [0x55];
        if (_1 == 'sp') return [0x54];
    }
    if (inst == 'push_bp'){
        if (-0x80 <= _1 && _1 <= 0x7f)  return [0xff, 0x76, ...imm8(_1)];
        else                            return [0xff, 0xb6, ...imm16(_1)];
    }
    if (inst == 'pop_reg'){
        if (_1 == 'ax') return [0x58];
        if (_1 == 'bx') return [0x5b];
        if (_1 == 'cx') return [0x59];
        if (_1 == 'dx') return [0x5a];
        if (_1 == 'bp') return [0x5d];
        if (_1 == 'sp') return [0x5c];
    }
    if (inst == 'add_imm'){
        if (-0x80 <= _2 && _2 <= 0x7f){
            if (_1 == 'ax') return [0x83, 0xc0, ...imm8(_2)];
            if (_1 == 'bx') return [0x83, 0xc3, ...imm8(_2)];
            if (_1 == 'cx') return [0x83, 0xc1, ...imm8(_2)];
            if (_1 == 'dx') return [0x83, 0xc2, ...imm8(_2)];
            if (_1 == 'bp') return [0x83, 0xc5, ...imm8(_2)];
            if (_1 == 'sp') return [0x83, 0xc4, ...imm8(_2)];
        }else{
            if (_1 == 'ax') return [0x05,       ...imm16(_2)];
            if (_1 == 'bx') return [0x81, 0xc3, ...imm16(_2)];
            if (_1 == 'cx') return [0x81, 0xc1, ...imm16(_2)];
            if (_1 == 'dx') return [0x81, 0xc2, ...imm16(_2)];
            if (_1 == 'bp') return [0x81, 0xc5, ...imm16(_2)];
            if (_1 == 'sp') return [0x81, 0xc4, ...imm16(_2)];
        }
    }
    if (inst == 'sub_imm'){
        if (-0x80 <= _2 && _2 <= 0x7f){
            if (_1 == 'ax') return [0x83, 0xe8, ...imm8(_2)];
            if (_1 == 'bx') return [0x83, 0xeb, ...imm8(_2)];
            if (_1 == 'cx') return [0x83, 0xe9, ...imm8(_2)];
            if (_1 == 'dx') return [0x83, 0xea, ...imm8(_2)];
            if (_1 == 'bp') return [0x83, 0xed, ...imm8(_2)];
            if (_1 == 'sp') return [0x83, 0xec, ...imm8(_2)];
        }else{
            if (_1 == 'ax') return [0x2d,       ...imm16(_2)];
            if (_1 == 'bx') return [0x81, 0xeb, ...imm16(_2)];
            if (_1 == 'cx') return [0x81, 0xe9, ...imm16(_2)];
            if (_1 == 'dx') return [0x81, 0xea, ...imm16(_2)];
            if (_1 == 'bp') return [0x81, 0xed, ...imm16(_2)];
            if (_1 == 'sp') return [0x81, 0xec, ...imm16(_2)];
        }
    }
}

class Compiler{
    constructor(){
        this.bytes = new Uint8Array(65536);
        this.byte_length = 0;

        this.functions = {};
        this.scopes = [];
    }
    push_bytes(bytes){
        for (let i = 0; i < bytes.length; i++){
            this.bytes[this.byte_length++] = bytes[i];
        }
    }
    macro(inst, _1, _2){
        if (inst == 'mov_operand'){
            // helper to mov things (variable/string literal address/asm integer literal) into register
            if (_2.startsWith('$')){
                // ttt variable
                if (Object.keys(this.scopes[0]).includes(_2) == false){
                    throw new Error(`Undefined identifier ${_2}`);
                }
                // ttt variable are stored at *(bp - var_offset)
                return asm('mov_word_bp', _1, -this.scopes[0][_2]);
            }else if (_2.startsWith('"')){
                // ttt string literal
                // ttt string literal are directly packed into COM code byte:
                //     jmp string_literal_end
                //     ... actual bytes of ttt string literal ...
                //     string_literal_end
                // thus the string literal will be in COM code byte,
                // but skipped execution by the jmp instruction
                let result = [];

                let literal_address = this.byte_length + 0x100; // +0x100 as COM code byte loaded at 0x100
                // jmp instruction
                if (_2.length < 128){
                    literal_address += 2;
                    result.push(0xeb, ...imm8(_2.length)); // jmp
                }else{
                    literal_address += 3;
                    result.push(0xe9, ...imm16(_2.length)); // jmp
                }

                // actual string byte
                for (let i = 1; i < _2.length; i++) result.push(...imm8(_2.charCodeAt(i)));

                // additional '$' at the end of string literal
                // '$' instead of null character as puts use '$' as string terminator
                result.push(...[0x24]);

                // now we mov the address into register
                result.push(...asm('mov_imm', _1, literal_address));
                return result;
            }else{
                // ttt interger literal
                return asm('mov_imm', _1, parseInt(_2));
            }
        }
    }
    compile_program(ast){
        // program entry
        // call main, then call dos function 0x4c
        // dos interrupt is int 0x21, which is the api provided by dos
        // dos function 0x4c is exit program
        this.push_bytes([0xb8, ...imm16(0)]);   // mov ax, 0x0 (replaced with address of main later)
        this.push_bytes([0xff, 0xd0]);          // call ax
        this.push_bytes([0xb4, 0x4c]);          // mov ah, 0x4c
        this.push_bytes([0xcd, 0x21]);          // int 0x21

        // compile all functions
        for (let f of ast.functions) this.compile_function(f);

        // fill in address of main in program entry
        this.bytes[1] = this.functions['$main'] & 0xff;
        this.bytes[2] = (this.functions['$main'] >> 8) & 0xff;
    }
    compile_function(ast){
        this.functions[ast.function_name] = this.byte_length + 0x100; // +0x100 as COM code byte loaded at 0x100

        // create a scope for the function
        this.scopes.unshift({accumulated: 0});
        // TODO: parameter

        // function prologue
        //    push bp into stack, as bp has the base pointer of caller, and callee should not change the bp, so pushing the value in order to restore later
        //    mov sp into bp, in order to store current stack frame address to bp
        this.push_bytes(asm('push_reg', 'bp'));
        this.push_bytes([0x89, 0xe5]); // mov bp, sp

        // compile the function body
        for (let s of ast.body){
            this.compile_statement(s);
        }

        // function epilogue
        //    add sp with accumulated length of current scope, as to remove ttt local variable in the stack frame
        //    pop bp, as to restore caller base pointer
        //    ret
        this.push_bytes(asm('add_imm', 'sp', this.scopes[0]['accumulated']));
        this.push_bytes(asm('pop_reg', 'bp'));
        this.push_bytes([0xc3]); // ret

        // remove function scope
        this.scopes.shift();
    }
    compile_statement(s){
        if      (s.statement == 'declare')      this.compile_declare_statement(s);
        else if (s.statement == 'expression')   this.compile_expression(s.expression);
        else if (s.statement == 'return')       this.compile_return_statement(s);
        else if (s.statement == 'if')           this.compile_if_statement(s);
        else                                    throw new Error(`${s.statement} statement not supported`);
    }
    compile_declare_statement(ast){
        // check redefinition
        if (Object.keys(this.scopes[0]).includes(ast.var_name)){
            throw new Error(`Redefining ${ast.var_name}`);
        }

        let size = (ast.type.basic == 'char' && ast.type.pointer_count == 0) ? 1 : 2;
        if (size == 1) throw new Error('char not supported');

        // grow the stack to create space for the ttt local variable
        // subtrate to grow as x86 stack grows downward instead of upward
        this.push_bytes(asm('sub_imm', 'sp', size));

        // book keeping: address of ttt local variable relative to bp
        this.scopes[0]['accumulated'] += size;
        this.scopes[0][ast.var_name] = this.scopes[0]['accumulated'];
    }
    compile_expression(ast){
        // expression results will be stored in ax

        // special handling: variable/string literal/integer literal
        if (typeof ast === 'string'){
            this.push_bytes(this.macro('mov_operand', 'ax', ast));
            return;
        }

        // special handling: function call
        // TODO: currently does not support function call chaining, eg. f(1)(2)
        if (ast.operators && ast.operators[0] == '('){
            if (ast.operands[0] == '$puts'){
                // special handle for puts, as it is a dos api call
                // dos function 0x09 is write string to stdout, with '$' as string terminator
                this.compile_expression(ast.operands[1][0]);
                this.push_bytes([0x89, 0xc2]); // mov dx, ax        // mov string address into dx, required by dos api
                this.push_bytes([0xb4, 0x09]); // mov ah, 0x09
                this.push_bytes([0xcd, 0x21]); // int 0x21
                return;
            }

            
            // push arguments into stack
            for (let i = ast.operands[1].length - 1; i >= 0; i--){
                this.compile_expression(ast.operands[1][i]);
                this.push_bytes(asm('push_reg', 'ax'));
            }
            // call function
            let function_address = this.functions[ast.operands[0]];
            this.push_bytes(asm('mov_imm', 'ax', function_address));
            this.push_bytes([0xff, 0xd0]); // call ax
            // remove arguments from stack
            this.push_bytes(asm('add_imm', 'sp', ast.operands[1].length * 2));
            return;
        }
        
        // special handling: assignment
        // TODO: currently does not support assignment chaining, eg. a = b = 1;
        if (ast.operators && ast.operators[0] == '='){
            if (Object.keys(this.scopes[0]).includes(ast.operands[0]) == false){
                throw new Error(`Unknown identifier ${ast.operands[0]}`);
            }

            // prepare right hand side
            this.compile_expression(ast.operands[1]);
            // store the value into ttt local variable
            this.push_bytes(asm('mov_reg_bp', 'ax', -this.scopes[0][ast.operands[0]]));
            return;
        }

        // prepare the first operand in ax
        if (typeof ast.operands[0] === 'string'){
            this.push_bytes(this.macro('mov_operand', 'ax', ast.operands[0]));
        }else{
            this.compile_expression(ast.operands[0]);
        }
        
        for (let i = 1; i < ast.operands.length; i++){
            // prepare the next operand in bx
            if (typeof ast.operands[i] === 'string'){
                // variable/string literal/integer literal
                this.push_bytes(this.macro('mov_operand', 'bx', ast.operands[i]));
            }else{
                // expression
                // temporarily store ax in stack, as later eval will pollute ax
                this.push_bytes(asm('push_reg', 'ax'));
                // eval the expression into bx
                this.compile_expression(ast.operands[i]);
                this.push_bytes([0x89, 0xc3]); // mov bx, ax
                // restore ax
                this.push_bytes(asm('pop_reg', 'ax'));
            }

            // operators
            // for comparison:
            //    we first assume the comparison result is true
            //    then we skip the later 'assume false' conditionally
            // ie.
            //    cmp ax, bx
            //    mov ax, 1    // result = 1 due to assumption
            //    jcc $+2      // if condition is ture (base on cmp), then skip the 'result = 0'
            //    xor ax, ax   // result = 0
            if      (ast.operators[i-1] == '+') this.push_bytes([0x01, 0xd8]); // add ax, bx
            else if (ast.operators[i-1] == '-') this.push_bytes([0x29, 0xd8]); // sub ax, bx
            else if (ast.operators[i-1] == '*') this.push_bytes([0x0f, 0xaf, 0xc3]); // imul ax, bx
            else if (ast.operators[i-1] == '/') this.push_bytes([0xf7, 0xfb]); // idiv ax, bx
            else if (ast.operators[i-1] == '==')this.push_bytes([
                0x39, 0xd8,         // cmp ax, bx
                0xb8, 0x01, 0x00,   // mov ax, 1
                0x74, 0x02,         // je $+2
                0x31, 0xc0]);       // xor ax, ax
            else if (ast.operators[i-1] == '!=')this.push_bytes([
                0x39, 0xd8,         // cmp ax, bx
                0xb8, 0x01, 0x00,   // mov ax, 1
                0x75, 0x02,         // jne $+2
                0x31, 0xc0]);       // xor ax, ax
            else if (ast.operators[i-1] == '>')this.push_bytes([
                0x39, 0xd8,         // cmp ax, bx
                0xb8, 0x01, 0x00,   // mov ax, 1
                0x7f, 0x02,         // jg $+2
                0x31, 0xc0]);       // xor ax, ax
            else if (ast.operators[i-1] == '<')this.push_bytes([
                0x39, 0xd8,         // cmp ax, bx
                0xb8, 0x01, 0x00,   // mov ax, 1
                0x7c, 0x02,         // jl $+2
                0x31, 0xc0]);       // xor ax, ax
            else if (ast.operators[i-1] == '>=')this.push_bytes([
                0x39, 0xd8,         // cmp ax, bx
                0xb8, 0x01, 0x00,   // mov ax, 1
                0x7d, 0x02,         // jge $+2
                0x31, 0xc0]);       // xor ax, ax
            else if (ast.operators[i-1] == '<=')this.push_bytes([
                0x39, 0xd8,         // cmp ax, bx
                0xb8, 0x01, 0x00,   // mov ax, 1
                0x7e, 0x02,         // jle $+2
                0x31, 0xc0]);       // xor ax, ax
            else                                throw new Error(`${ast.operators[i-1]} not supported`);
        }
    }
    compile_return_statement(ast){
        // eval return value
        this.compile_expression(ast.expression);
        // function epilogue, see compile_function
        this.push_bytes(asm('add_imm', 'sp', this.scopes[0]['accumulated']));
        this.push_bytes(asm('pop_reg', 'bp'));
        this.push_bytes([0xc3]);
    }
    compile_if_statement(ast){
        // if structure:
        //    condition1
        //    if condition1 == 0 then skip body1
        //    body1, jmp to exit_if
        // 
        //    condition2
        //    if condition2 == 0 then skip body2
        //    body2, jmp to exit_if
        //
        //    ...
        //
        //    body_else
        //  exit_if:
        let exit_addresses = [];
        for (let i = 0; i < ast.bodies.length; i++){
            if (i < ast.conditions.length){
                // this is not the final else

                // eval condition
                this.compile_expression(ast.conditions[i]);
                // skip the body if condition is zero
                this.push_bytes([0x85, 0xc0]);  // test ax, ax
                this.push_bytes([0x74, 0x00]);  // jz          // offset filled later
            }

            // body
            let begin = this.byte_length;
            for (let s of ast.bodies[i]){
                this.compile_statement(s);
            }

            if (i < ast.conditions.length){
                // this is not the final else

                // jmp to exit_if
                this.push_bytes([0xb8, ...imm16(0)]);   // mov ax, 0x0 // address filled later
                this.push_bytes([0xff, 0xe0]);          // jmp ax
                let end = this.byte_length;
                this.bytes[begin - 1] = imm8(end - begin)[0];
                exit_addresses.push(end - 4);
            }
        }
        let exit_address = imm16(this.byte_length + 0x100); // +0x100 as COM code byte loaded at 0x100
        // fill in exit_if address
        for (let a of exit_addresses){
            this.bytes[a  ] = exit_address[0];
            this.bytes[a+1] = exit_address[1];
        }
    }
};

// export
return {
    Compiler: Compiler,
};

})();

