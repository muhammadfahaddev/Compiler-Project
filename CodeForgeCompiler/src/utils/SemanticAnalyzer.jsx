import React, { useState } from 'react';


export default class SemanticAnalyzer {
    constructor(symbolTable, tokens) {
        this.symbolTable = symbolTable;
        this.tokens = tokens;
        this.errors = [];
    }

    analyze() {
        this.checkVariableUsage();
        this.checkAssignmentTypes();
        this.checkTypeCompatibility();
        return this.errors;
    }

    getValueType(value) {
        if (/^-?\d+$/.test(value)) return 'nmb';
        if (/^-?\d+\.\d*$/.test(value)) return 'flat';
        if (/^".*"$/.test(value)) return 'Sring';
        if (/^(?:true|false)$/.test(value)) return 'buul';
        return this.symbolTable[value]?.data_type || 'unknown';
    }

    checkVariableUsage() {
        this.tokens.forEach(([type, lexeme, line]) => {
            if (type === 'IDENTIFIER' && !(lexeme in this.symbolTable)) {
                this.errors.push(`Semantic error: Variable '${lexeme}' used without declaration at line ${line}`);
            }
        });
    }

    checkAssignmentTypes() {
        for (let i = 0; i < this.tokens.length; i++) {
            const [type, , line] = this.tokens[i];
            if (type === 'ASSIGN') {
                const varTok = this.tokens[i - 1], valTok = this.tokens[i + 1];
                const varType = this.symbolTable[varTok[1]]?.data_type;
                const valType = this.getValueType(valTok[1]);
                if (varType && valType && varType !== valType) {
                    this.errors.push(`Semantic error: Type mismatch at line ${line}: ${valType} → ${varType}`);
                }
            }
        }
    }

    checkTypeCompatibility() {
        const numericOps = [
            '+.', '-.', '*.', '/.', '%.',// dot-style
        ];
        for (let i = 0; i < this.tokens.length; i++) {
            const [type, lexeme, line] = this.tokens[i];
            if (type === 'OPERATOR' && numericOps.includes(lexeme)) {
                const left = this.getValueType(this.tokens[i - 1][1]);
                const right = this.getValueType(this.tokens[i + 1][1]);
                if (!['nmb', 'flat'].includes(left) || !['nmb', 'flat'].includes(right)) {
                    this.errors.push(`Semantic error: Non-numeric operands for ${lexeme} at line ${line}`);
                } else if (left !== right) {
                    this.errors.push(`Semantic error: Operand type mismatch for ${lexeme} at line ${line}`);
                }
            }
        }
    }
  
}
