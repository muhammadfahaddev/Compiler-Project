// src/utils/SyntaxAnalyzer.js
export default class Parser {
  constructor(tokens = []) {
    this.tokens = tokens;
    this.i = 0;
    this.cur = tokens[0] || null;
    this.blockStack = [];
    this.errors = [];
  }

  advance() {
    this.i++;
    this.cur = this.tokens[this.i] || null;
  }

  peek(offset = 1) {
    return this.tokens[this.i + offset] || null;
  }

  match(expected) {
    if (!this.cur || this.cur[0] === expected) {
      this.advance();
    } else {
      const found = this.cur[0], line = this.cur[2];
      this.errors.push(`Syntax error: Expected ${expected}, found ${found} at line ${line}`);
      this.advance();
    }
  }

  parse() {
    this.program();
    return this.errors;
  }

  program() {
    this.statementList();
  }

  statementList() {
    while (this.cur && this.cur[0] !== 'RCURLY') {
      this.statement();
    }
    if (!this.cur && this.blockStack.length) {
      const [, startLine] = this.blockStack.pop();
      this.errors.push(`Syntax error: Missing '}' for block started at line ${startLine}`);
    }
    if (this.cur && this.cur[0] === 'RCURLY') {
      this.blockStack.pop();
      this.advance();
    }
  }

  statement() {
    if (!this.cur) return;
    const [t, val] = this.cur;
    if (t === 'LCURLY') {
      this.block();
    }
    else if (t === 'RCURLY') {
      this.blockStack.pop();
      this.advance();
    }
    else if (t === 'DATA_TYPE') {
      this.declaration();
    }
    else if (t === 'IDENTIFIER' && this.peek()?.[0] === 'ASSIGN') {
      this.assignment();
    }
    else if (t === 'KEYWORD') {
      this.handleKeyword(val);
    }
    else {
      this.advance();
    }
  }

  handleKeyword(val) {
    if (val === 'oye') {
      this.conditional();
    }
    else if (val === 'naioye') {
      this.advance();
      this.block();
    }
    else if (val === 'brk') {
      this.advance();
      this.match('SEMICOLON');
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
    else if (val === 'Ex') {
      this.functionDef();
    }
    else if (['printO', 'enter', 'rat'].includes(val)) {
      this.callStmt();
    }
    else {
      this.advance();
    }
  }

  declaration() {
    // DATA_TYPE IDENT =. exprChain;
    this.match('DATA_TYPE');
    if (this.cur && this.cur[0] === 'IDENTIFIER') {
      this.match('IDENTIFIER');
      if (this.cur && this.cur[0] === 'ASSIGN') {
        this.match('ASSIGN');
        this.parseExpressionChain();
      }
      this.match('SEMICOLON');
    }
  }

  assignment() {
    // IDENT =. exprChain;
    this.match('IDENTIFIER');
    this.match('ASSIGN');
    this.parseExpressionChain();
    this.match('SEMICOLON');
  }

  parseExpressionChain() {
    // first operand
    if (!this.cur) return;
    if (['IDENTIFIER', 'NUMBER', 'STRING', 'BOOLEAN'].includes(this.cur[0])) {
      this.match(this.cur[0]);
    } else {
      this.advance();
      return;
    }
    // then zero or more OPERATOR operand
    while (this.cur && this.cur[0] === 'OPERATOR') {
      this.match('OPERATOR');
      if (this.cur && ['IDENTIFIER', 'NUMBER', 'STRING', 'BOOLEAN'].includes(this.cur[0])) {
        this.match(this.cur[0]);
      } else {
        break;
      }
    }
  }

  conditional() {
    // oye(condition) { ... } [chaloye(condition) { ... }]... [naioye { ... }]
    this.match('KEYWORD'); // oye
    this.match('LPAREN');
    this.parseExpressionChain();
    this.match('RPAREN');
    this.block();

    // chaloye blocks
    while (this.cur && this.cur[0] === 'KEYWORD' && this.cur[1] === 'chaloye') {
      this.match('KEYWORD');
      this.match('LPAREN');
      this.parseExpressionChain();
      this.match('RPAREN');
      this.block();
    }
    // else
    if (this.cur && this.cur[0] === 'KEYWORD' && this.cur[1] === 'naioye') {
      this.match('KEYWORD');
      this.block();
    }
  }

  whileLoop() {
    // wish(condition) { ... }
    this.match('KEYWORD'); // wish
    this.match('LPAREN');
    this.parseExpressionChain();
    this.match('RPAREN');
    this.block();
  }

  doWhileLoop() {
    // last { ... } wish(condition);
    this.match('KEYWORD'); // last
    this.block();
    if (this.cur && this.cur[0] === 'KEYWORD' && this.cur[1] === 'wish') {
      this.match('KEYWORD');
      this.match('LPAREN');
      this.parseExpressionChain();
      this.match('RPAREN');
      this.match('SEMICOLON');
    } else {
      const line = this.cur?.[2] || '?';
      this.errors.push(`Syntax error: Expected 'wish(...)' after do-while block at line ${line}`);
    }
  }

  firstLoop() {
    // first(nmb i =. start; i OP end; i =. i OP step) { ... }
    this.match('KEYWORD'); // first
    this.match('LPAREN');
    // initialization
    this.declaration();
    // condition
    this.parseExpressionChain();
    this.match('SEMICOLON');
    // increment: parse chain until RPAREN
    while (this.cur && this.cur[0] !== 'RPAREN') {
      this.parseExpressionChain();
      // if comma or other, just advance; but usually single chain
      if (this.cur && this.cur[0] !== 'RPAREN') this.advance();
    }
    this.match('RPAREN');
    this.block();
  }

  functionDef() {
    // Ex IDENT(...) { ... }
    this.match('KEYWORD'); // Ex
    this.match('IDENTIFIER');
    this.match('LPAREN');
    while (this.cur && this.cur[0] !== 'RPAREN') {
      this.advance();
    }
    this.match('RPAREN');
    this.block();
  }

  callStmt() {
    // printO(...); enter(...);
    this.match('KEYWORD');
    this.match('LPAREN');
    while (this.cur && this.cur[0] !== 'RPAREN') {
      this.parseExpressionChain();
      if (this.cur && this.cur[0] === 'COMMA') this.match('COMMA');
    }
    this.match('RPAREN');
    this.match('SEMICOLON');
  }

  block() {
    if (this.cur) this.blockStack.push(['BLOCK', this.cur[2]]);
    this.match('LCURLY');
    this.statementList();
  }
}
