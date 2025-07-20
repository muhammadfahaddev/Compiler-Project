// src/utils/IntermediateCodeGenerator.js

export default class IntermediateCodeGenerator {
  constructor(symbolTable, tokens) {
    this.symbolTable = symbolTable;
    this.tokens      = tokens;
    this.i           = 0;
    this.cur         = tokens[0] || null;
    this.tempCount   = 0;
    this.labelCount  = 0;
    this.ir          = [];
    this.loopEndStack = [];
  }

  nextTemp() {
    return `t${++this.tempCount}`;
  }

  newLabel() {
    return `L${++this.labelCount}`;
  }

  advance() {
    this.i++;
    this.cur = this.tokens[this.i] || null;
  }

  peek(n = 1) {
    return this.tokens[this.i + n] || null;
  }

  generate() {
    while (this.cur) {
      this.statement();
    }
    return this.ir;
  }

  statement() {
    if (!this.cur) return;
    const [type, val] = this.cur;

    if (type === 'DATA_TYPE') {
      this.declaration();
    }
    else if (type === 'IDENTIFIER' && this.peek()?.[0] === 'ASSIGN') {
      this.assignment();
    }
    else if (type === 'KEYWORD') {
      if (val === 'oye') {
        this.conditionalChain();
      }
      else if (val === 'chaloye') {
        // stray else-if: skip parse and block
        this.advance();
        this.match('LPAREN');
        this.parseExpressionChain(); // skip
        this.match('RPAREN');
        this.block();
      }
      else if (val === 'naioye') {
        this.advance();
        this.block();
      }
      else if (val === 'wish') {
        this.whileLoop();
      }
      else if (val === 'last') {
        this.doWhileLoop();
      }
      else if (val === 'first') {
        this.firstLoop();
      }
      else if (val === 'brk') {
        this.breakStmt();
      }
      else if (val === 'Ex') {
        this.funcDef();
      }
      else {
        this.callStmt();
      }
    }
    else {
      this.advance();
    }
  }

  declaration() {
    // DATA_TYPE IDENT =. exprChain;
    this.advance(); // skip DATA_TYPE
    const varName = this.cur[1];
    this.advance(); // skip IDENT
    if (this.cur?.[0] === 'ASSIGN') {
      this.advance(); // skip ASSIGN
      const addr = this.parseExpressionChain();
      this.ir.push({ op: 'assign', arg1: addr, result: varName });
    }
    if (this.cur?.[0] === 'SEMICOLON') this.advance();
  }

  assignment() {
    // IDENT =. exprChain;
    const varName = this.cur[1];
    this.advance(); // IDENT
    this.advance(); // ASSIGN
    const addr = this.parseExpressionChain();
    this.ir.push({ op: 'assign', arg1: addr, result: varName });
    if (this.cur?.[0] === 'SEMICOLON') this.advance();
  }

  // parse arithmetic chain, return temp or literal/IDENT
  parseExpressionChain() {
    let left;
    if (this.cur && ['IDENTIFIER','NUMBER','STRING','BOOLEAN'].includes(this.cur[0])) {
      left = this.cur[1];
      this.advance();
    } else {
      left = '0';
      this.advance();
    }

    while (this.cur && this.cur[0] === 'OPERATOR' && this.isArithmeticOp(this.cur[1])) {
      const opLex = this.cur[1];
      this.advance();
      let right;
      if (this.cur && ['IDENTIFIER','NUMBER','STRING','BOOLEAN'].includes(this.cur[0])) {
        right = this.cur[1];
        this.advance();
      } else {
        right = '0';
        this.advance();
      }
      const tmp = this.nextTemp();
      this.ir.push({ op: opLex, arg1: left, arg2: right, result: tmp });
      left = tmp;
    }
    return left;
  }

  isComparisonOp(op) {
    return ["==", "==.", "!=", "!=.", ">", ">.", "<", "<.", ">=", ">=.", "<=", "<=."].includes(op);
  }

  isArithmeticOp(op) {
    return ["+", "+.", "-", "-.", "*", "*.", "/", "/.", "%", "%."].includes(op);
  }

  // parse condition: arithmetic chain [comparison_op operand], return temp and comp
  parseCondition() {
    // parse arithmetic chain
    let leftTemp;
    if (this.cur && ['IDENTIFIER','NUMBER'].includes(this.cur[0])) {
      const firstOp = this.cur[1];
      this.advance();
      if (this.cur && this.cur[0] === 'OPERATOR' && this.isArithmeticOp(this.cur[1])) {
        leftTemp = this.nextTemp();
        this.ir.push({ op: 'assign', arg1: firstOp, result: leftTemp });
        while (this.cur && this.cur[0] === 'OPERATOR' && this.isArithmeticOp(this.cur[1])) {
          const opLex = this.cur[1];
          this.advance();
          let right;
          if (this.cur && ['IDENTIFIER','NUMBER'].includes(this.cur[0])) {
            right = this.cur[1];
            this.advance();
          } else {
            right = '0';
            this.advance();
          }
          this.ir.push({ op: opLex, arg1: leftTemp, arg2: right, result: leftTemp });
        }
      } else {
        leftTemp = firstOp;
      }
    } else {
      leftTemp = '0';
      this.advance();
    }

    // comparison?
    if (this.cur && this.cur[0] === 'OPERATOR' && this.isComparisonOp(this.cur[1])) {
      const compOp = this.cur[1];
      this.advance();
      let rightOperand;
      if (this.cur && ['IDENTIFIER','NUMBER'].includes(this.cur[0])) {
        rightOperand = this.cur[1];
        this.advance();
      } else {
        rightOperand = '0';
        this.advance();
      }
      return [leftTemp, compOp, rightOperand];
    } else {
      return [leftTemp, '!=', '0'];
    }
  }

  conditionalChain() {
    // oye(condition) { ... } [chaloye(condition){...}]* [naioye { ... }]
    this.advance(); // skip 'oye'
    this.match('LPAREN');
    const [leftTemp, compOp, rightOperand] = this.parseCondition();
    this.match('RPAREN');

    const endLbl = this.newLabel();
    const nextLbls = [];

    // first branch
    const nextLbl0 = this.newLabel();
    nextLbls.push(nextLbl0);
    this.ir.push({ op: 'CMP', arg1: leftTemp, arg2: rightOperand, result: null });
    this.ir.push({ op: this._irJumpFalse(compOp), arg1: null, arg2: null, result: nextLbl0 });
    this.block();
    this.ir.push({ op: 'goto', arg1: null, arg2: null, result: endLbl });
    this.ir.push({ op: 'label', arg1: null, arg2: null, result: nextLbl0 });

    // chaloye branches
    while (this.cur && this.cur[0] === 'KEYWORD' && this.cur[1] === 'chaloye') {
      this.advance(); // skip 'chaloye'
      this.match('LPAREN');
      const [lTemp, cOp, rOp] = this.parseCondition();
      this.match('RPAREN');
      const nextLbl = this.newLabel();
      nextLbls.push(nextLbl);
      this.ir.push({ op: 'CMP', arg1: lTemp, arg2: rOp, result: null });
      this.ir.push({ op: this._irJumpFalse(cOp), arg1: null, arg2: null, result: nextLbl });
      this.block();
      this.ir.push({ op: 'goto', arg1: null, arg2: null, result: endLbl });
      this.ir.push({ op: 'label', arg1: null, arg2: null, result: nextLbl });
    }

    // naioye
    if (this.cur && this.cur[0] === 'KEYWORD' && this.cur[1] === 'naioye') {
      this.advance();
      this.block();
    }

    this.ir.push({ op: 'label', arg1: null, arg2: null, result: endLbl });
  }

  whileLoop() {
    // wish(condition) { ... }
    this.advance(); // skip 'wish'
    this.match('LPAREN');
    const [leftTemp, compOp, rightOperand] = this.parseCondition();
    this.match('RPAREN');

    const startLbl = this.newLabel();
    const endLbl = this.newLabel();
    this.ir.push({ op: 'label', arg1: null, arg2: null, result: startLbl });
    this.ir.push({ op: 'CMP', arg1: leftTemp, arg2: rightOperand, result: null });
    this.ir.push({ op: this._irJumpFalse(compOp), arg1: null, arg2: null, result: endLbl });

    this.loopEndStack.push(endLbl);
    this.block();
    this.loopEndStack.pop();

    this.ir.push({ op: 'goto', arg1: null, arg2: null, result: startLbl });
    this.ir.push({ op: 'label', arg1: null, arg2: null, result: endLbl });
  }

  doWhileLoop() {
    // last { ... } wish(condition);
    this.advance(); // skip 'last'
    const startLbl = this.newLabel();
    const endLbl = this.newLabel();
    this.ir.push({ op: 'label', arg1: null, arg2: null, result: startLbl });

    this.loopEndStack.push(endLbl);
    this.block();
    this.loopEndStack.pop();

    if (this.cur && this.cur[0] === 'KEYWORD' && this.cur[1] === 'wish') {
      this.advance();
      this.match('LPAREN');
      const [leftTemp, compOp, rightOperand] = this.parseCondition();
      this.match('RPAREN');
      if (this.cur?.[0] === 'SEMICOLON') this.advance();
      // ifTrue: repeat
      this.ir.push({ op: 'CMP', arg1: leftTemp, arg2: rightOperand, result: null });
      this.ir.push({ op: this._irJumpTrue(compOp), arg1: null, arg2: null, result: startLbl });
    }
    this.ir.push({ op: 'label', arg1: null, arg2: null, result: endLbl });
  }

  firstLoop() {
    // first(nmb i =. start; i OP end; i =. i OP step) { ... }
    this.advance(); // skip 'first'
    this.match('LPAREN');

    // initialization
    let iterVar = null;
    if (this.cur?.[0] === 'DATA_TYPE') {
      this.advance();
      if (this.cur?.[0] === 'IDENTIFIER') {
        iterVar = this.cur[1];
        this.advance();
        if (this.cur?.[0] === 'ASSIGN') {
          this.advance();
          const addr = this.parseExpressionChain();
          this.ir.push({ op: 'assign', arg1: addr, result: iterVar });
        }
      }
    }
    this.match('SEMICOLON');

    // condition
    let condLeftTemp, condOp, condRight;
    if (this.cur && ['IDENTIFIER','NUMBER'].includes(this.cur[0])) {
      [condLeftTemp, condOp, condRight] = this.parseCondition();
    } else {
      condLeftTemp = '0'; condOp = '!=';
      this.advance();
    }
    this.match('SEMICOLON');

    // increment tokens
    const incTokens = [];
    while (this.cur && this.cur[0] !== 'RPAREN') {
      incTokens.push(this.cur);
      this.advance();
    }
    this.match('RPAREN');

    const startLbl = this.newLabel();
    const endLbl = this.newLabel();
    this.ir.push({ op: 'label', arg1: null, arg2: null, result: startLbl });
    this.ir.push({ op: 'CMP', arg1: condLeftTemp, arg2: condRight, result: null });
    this.ir.push({ op: this._irJumpFalse(condOp), arg1: null, arg2: null, result: endLbl });

    this.loopEndStack.push(endLbl);
    this.block();
    this.loopEndStack.pop();

    // process incTokens
    if (iterVar && incTokens.length) {
      let idx = 0;
      if (
        incTokens[idx] &&
        incTokens[idx][0] === 'IDENTIFIER' &&
        incTokens[idx+1] &&
        incTokens[idx+1][0] === 'ASSIGN'
      ) {
        const varName = incTokens[idx][1];
        idx += 2;
        // simulate parseExpressionChain on incTokens[idx...]
        const savedTokens = this.tokens, savedI = this.i, savedCur = this.cur;
        this.tokens = incTokens.slice(idx);
        this.i = 0;
        this.cur = this.tokens[0] || null;
        const addr = this.parseExpressionChain();
        this.ir.push({ op: 'assign', arg1: addr, result: varName });
        this.tokens = savedTokens;
        this.i = savedI;
        this.cur = savedCur;
      }
      else if (
        incTokens[idx] &&
        incTokens[idx][0] === 'IDENTIFIER' &&
        incTokens[idx+1] &&
        incTokens[idx+1][0] === 'OPERATOR' &&
        this.isArithmeticOp(incTokens[idx+1][1])
      ) {
        const varName = incTokens[idx][1];
        const opLex = incTokens[idx+1][1];
        const rightTok = incTokens[idx+2];
        const right = rightTok ? rightTok[1] : '1';
        const tmp = this.nextTemp();
        this.ir.push({ op: 'assign', arg1: varName, result: tmp });
        this.ir.push({ op: opLex, arg1: tmp, arg2: right, result: tmp });
        this.ir.push({ op: 'assign', arg1: tmp, result: varName });
      }
    }

    this.ir.push({ op: 'goto', arg1: null, arg2: null, result: startLbl });
    this.ir.push({ op: 'label', arg1: null, arg2: null, result: endLbl });
  }

  breakStmt() {
    this.advance(); // skip 'brk'
    if (this.cur?.[0] === 'SEMICOLON') this.advance();
    const endLbl = this.loopEndStack[this.loopEndStack.length - 1];
    if (endLbl) {
      this.ir.push({ op: 'goto', arg1: null, arg2: null, result: endLbl });
    }
  }

  funcDef() {
    // Ex IDENT(...) { ... }
    this.advance(); // skip 'Ex'
    const name = this.cur[1];
    this.advance();
    this.match('LPAREN');
    while (this.cur && this.cur[0] !== 'RPAREN') this.advance();
    this.match('RPAREN');
    this.ir.push({ op: 'label', arg1: null, arg2: null, result: name });
    this.block();
    this.ir.push({ op: 'ret', arg1: null, arg2: null, result: null });
  }

  callStmt() {
    // IDENT or printO etc.
    const fnName = this.cur[1];
    this.advance();
    this.match('LPAREN');
    const args = [];
    while (this.cur && this.cur[0] !== 'RPAREN') {
      if (this.cur[0] === 'COMMA') { this.advance(); continue; }
      if (['IDENTIFIER','NUMBER','STRING','BOOLEAN'].includes(this.cur[0])) {
        const temp = this.parseExpressionChain();
        args.push(temp);
      } else {
        this.advance();
      }
    }
    this.match('RPAREN');
    if (this.cur?.[0] === 'SEMICOLON') this.advance();
    args.forEach(arg => this.ir.push({ op: 'param', arg1: arg, arg2: null, result: null }));
    this.ir.push({ op: 'call', arg1: fnName, arg2: args.length, result: null });
  }

  block() {
    if (this.cur?.[0] === 'LCURLY') this.advance();
    while (this.cur && this.cur[0] !== 'RCURLY') {
      this.statement();
    }
    if (this.cur?.[0] === 'RCURLY') this.advance();
  }

  match(expected) {
    if (this.cur?.[0] === expected) this.advance();
    else this.advance();
  }

  _irJumpFalse(op) {
    switch (op) {
      case "==.": case "==": return "JNE";
      case "!=.": case "!=": return "JE";
      case ">.": case ">": return "JLE";
      case "<.": case "<": return "JGE";
      case ">=.": case ">=": return "JL";
      case "<=.": case "<=": return "JG";
      default: return "JNE";
    }
  }

  _irJumpTrue(op) {
    switch (op) {
      case "==.": case "==": return "JE";
      case "!=.": case "!=": return "JNE";
      case ">.": case ">": return "JG";
      case "<.": case "<": return "JL";
      case ">=.": case ">=": return "JGE";
      case "<=.": case "<=": return "JLE";
      default: return "JE";
    }
  }
}
