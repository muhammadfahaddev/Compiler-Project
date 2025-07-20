// src/utils/CodeGenerator.js
export default class CodeGenerator {
  constructor(symbolTable, tokens) {
    this.symbolTable = symbolTable;
    this.tokens = tokens;
    this.i = 0;
    this.cur = tokens[0] || null;
    this.assembly = [];
    this.labelCount = 0;
    this.funcKeywords = ["printO", "rat", "enter"];
    this.loopEndStack = [];
  }

  advance() {
    this.i++;
    this.cur = this.tokens[this.i] || null;
  }

  peek(offset = 1) {
    return this.tokens[this.i + offset] || null;
  }

  newLabel() {
    return ++this.labelCount;
  }

  generate() {
    const mainAsm = [];
    const funcAsm = [];
    while (this.cur) {
      if (this.cur[0] === "KEYWORD" && this.cur[1] === "Ex") {
        const start = this.assembly.length;
        this.statement();
        const newLines = this.assembly.splice(start);
        funcAsm.push(...newLines);
      } else {
        const start = this.assembly.length;
        this.statement();
        const newLines = this.assembly.splice(start);
        mainAsm.push(...newLines);
      }
    }
    this.assembly = [...mainAsm, ...funcAsm];
    return this.assembly.join("\n");
  }

  statement() {
    if (!this.cur) return;
    const [type, val] = this.cur;
    if (type === "DATA_TYPE") {
      this.declaration();
    }
    else if (type === "IDENTIFIER" && this.peek()?.[0] === "ASSIGN") {
      this.assignment();
    }
    else if (type === "KEYWORD") {
      if (val === "oye") {
        this.conditional();
      }
      else if (val === "chaloye") {
        // should be handled in conditional chain; skip if stray
        this.advance();
        this.match("LPAREN");
        this.parseExpressionChain();
        this.match("RPAREN");
        this.block();
      }
      else if (val === "naioye") {
        this.advance();
        this.block();
      }
      else if (val === "brk") {
        this.advance();
        this.match("SEMICOLON");
        if (this.loopEndStack.length) {
          const endLbl = this.loopEndStack[this.loopEndStack.length - 1];
          this.assembly.push(`JMP L${endLbl}`);
        }
      }
      else if (val === "wish") {
        this.whileLoop();
      }
      else if (val === "last") {
        this.doWhileLoop();
      }
      else if (val === "first") {
        this.firstLoop();
      }
      else if (val === "Ex") {
        this.funcDef();
      }
      else if (this.funcKeywords.includes(val)) {
        this.keywordCall();
      }
      else {
        this.advance();
      }
    }
    else if (type === "IDENTIFIER" && this.peek()?.[0] === "LPAREN") {
      this.funcCall();
    }
    else {
      this.advance();
    }
  }

  declaration() {
    // DATA_TYPE IDENT =. exprChain;
    this.advance(); // skip DATA_TYPE
    const name = this.cur?.[1];
    this.advance(); // skip IDENT
    if (this.cur?.[0] === "ASSIGN") {
      this.advance(); // skip ASSIGN
      this.parseExpressionChainToVar(name);
    }
    if (this.cur?.[0] === "SEMICOLON") this.advance();
  }

  assignment() {
    // IDENT =. exprChain;
    const name = this.cur[1];
    this.advance(); // skip IDENT
    this.match("ASSIGN");
    this.parseExpressionChainToVar(name);
    if (this.cur?.[0] === "SEMICOLON") this.advance();
  }

  parseExpressionChainToVar(varName) {
    // first operand
    if (!this.cur) return;
    if (['IDENTIFIER', 'NUMBER', 'STRING', 'BOOLEAN'].includes(this.cur[0])) {
      const firstOp = this.cur[1];
      this.assembly.push(`MOV ${varName}, ${firstOp}`);
      this.advance();
    } else {
      this.advance();
      return;
    }
    while (this.cur && this.cur[0] === "OPERATOR") {
      const opTok = this.cur[1];
      this.advance();
      if (this.cur && ['IDENTIFIER', 'NUMBER'].includes(this.cur[0])) {
        const nextOp = this.cur[1];
        const instr = this._mapArithmetic(opTok);
        this.assembly.push(`${instr} ${varName}, ${nextOp}`);
        this.advance();
      } else {
        break;
      }
    }
  }

  conditional() {
    // oye(condition) { ... } [chaloye ...]* [naioye ...]
    this.advance(); // skip 'oye'
    this.match("LPAREN");
    // first condition
    const left0 = this.cur[1]; this.advance();
    const op0 = this.cur[1]; this.advance();
    const right0 = this.cur[1]; this.advance();
    this.match("RPAREN");

    const endLbl = this.newLabel();
    const nextLbls = [];

    // first branch
    const nextLbl0 = this.newLabel();
    nextLbls.push(nextLbl0);
    this.assembly.push(`CMP ${left0}, ${right0}`);
    const jumpFalse0 = this._mapCondJumpFalse(op0);
    this.assembly.push(`${jumpFalse0} L${nextLbl0}`);
    this.block();
    this.assembly.push(`JMP L${endLbl}`);
    this.assembly.push(`L${nextLbl0}:`);

    // chaloye branches
    while (this.cur && this.cur[0] === "KEYWORD" && this.cur[1] === "chaloye") {
      this.advance(); // skip 'chaloye'
      this.match("LPAREN");
      const left = this.cur[1]; this.advance();
      const op = this.cur[1]; this.advance();
      const right = this.cur[1]; this.advance();
      this.match("RPAREN");

      const nextLbl = this.newLabel();
      nextLbls.push(nextLbl);
      this.assembly.push(`CMP ${left}, ${right}`);
      const jumpFalse = this._mapCondJumpFalse(op);
      this.assembly.push(`${jumpFalse} L${nextLbl}`);
      this.block();
      this.assembly.push(`JMP L${endLbl}`);
      this.assembly.push(`L${nextLbl}:`);
    }

    // naioye
    if (this.cur && this.cur[0] === "KEYWORD" && this.cur[1] === "naioye") {
      this.advance();
      this.block();
    }

    this.assembly.push(`L${endLbl}:`);
  }

  whileLoop() {
    // wish(condition) { ... }
    this.advance(); // skip 'wish'
    this.match("LPAREN");
    const left = this.cur[1]; this.advance();
    const op = this.cur[1]; this.advance();
    const right = this.cur[1]; this.advance();
    this.match("RPAREN");

    const startLbl = this.newLabel();
    const endLbl = this.newLabel();
    this.assembly.push(`L${startLbl}:`);
    this.assembly.push(`CMP ${left}, ${right}`);
    const jumpFalse = this._mapCondJumpFalse(op);
    this.assembly.push(`${jumpFalse} L${endLbl}`);

    this.block();
    this.assembly.push(`JMP L${startLbl}`);
    this.assembly.push(`L${endLbl}:`);
  }

  doWhileLoop() {
    // last { ... } wish(condition);
    this.advance(); // skip 'last'
    const startLbl = this.newLabel();
    const endLbl = this.newLabel();
    this.assembly.push(`L${startLbl}:`);
    this.block();
    if (this.cur && this.cur[0] === "KEYWORD" && this.cur[1] === "wish") {
      this.advance();
      this.match("LPAREN");
      const left = this.cur[1]; this.advance();
      const op = this.cur[1]; this.advance();
      const right = this.cur[1]; this.advance();
      this.match("RPAREN");
      this.match("SEMICOLON");
      this.assembly.push(`CMP ${left}, ${right}`);
      const jumpTrue = this._mapCondJumpTrue(op);
      this.assembly.push(`${jumpTrue} L${startLbl}`);
    }
    this.assembly.push(`L${endLbl}:`);
  }

  firstLoop() {
    // first(nmb i =. start; i OP end; i =. i OP step) { ... }
    this.advance(); // skip 'first'
    this.match("LPAREN");

    // initialization
    let iterVar = null;
    if (this.cur?.[0] === "DATA_TYPE") {
      this.advance();
      if (this.cur?.[0] === "IDENTIFIER") {
        iterVar = this.cur[1];
        this.advance();
        if (this.cur?.[0] === "ASSIGN") {
          this.advance();
          this.parseExpressionChainToVar(iterVar);
        }
      }
    }
    this.match("SEMICOLON");

    // condition
    let left = null, op = null, right = null;
    if (this.cur && this.cur[0] === "IDENTIFIER") {
      left = this.cur[1]; this.advance();
      if (this.cur && this.cur[0] === "OPERATOR") {
        op = this.cur[1]; this.advance();
        if (this.cur && (this.cur[0] === "IDENTIFIER" || this.cur[0] === "NUMBER")) {
          right = this.cur[1]; this.advance();
        }
      }
    }
    this.match("SEMICOLON");

    // increment tokens
    const incTokens = [];
    while (this.cur && this.cur[0] !== "RPAREN") {
      incTokens.push(this.cur);
      this.advance();
    }
    this.match("RPAREN");

    const startLbl = this.newLabel();
    const endLbl = this.newLabel();
    this.loopEndStack.push(endLbl);

    if (left !== null && op !== null && right !== null) {
      this.assembly.push(`L${startLbl}:`);
      this.assembly.push(`CMP ${left}, ${right}`);
      const jumpFalse = this._mapCondJumpFalse(op);
      this.assembly.push(`${jumpFalse} L${endLbl}`);
    }

    this.block();

    // increment
    if (iterVar && incTokens.length) {
      const t0 = incTokens[0];
      if (t0 && t0[0] === "IDENTIFIER") {
        if (incTokens[1] && incTokens[1][0] === "ASSIGN") {
          // IDENT =. exprChain
          const varName = t0[1];
          let idx = 2;
          if (incTokens[idx] && (incTokens[idx][0] === "IDENTIFIER" || incTokens[idx][0] === "NUMBER")) {
            const firstOp = incTokens[idx][1];
            this.assembly.push(`MOV ${varName}, ${firstOp}`);
            idx++;
            while (idx + 1 < incTokens.length && incTokens[idx][0] === "OPERATOR" &&
                   (incTokens[idx+1][0] === "IDENTIFIER" || incTokens[idx+1][0] === "NUMBER")) {
              const opTok = incTokens[idx][1];
              const nextOp = incTokens[idx+1][1];
              this.assembly.push(`${this._mapArithmetic(opTok)} ${varName}, ${nextOp}`);
              idx += 2;
            }
          }
        }
        else if (incTokens[1] && incTokens[1][0] === "OPERATOR") {
          // IDENT OP expr
          const varName = t0[1];
          const opTok = incTokens[1][1];
          const nextOp = incTokens[2] && incTokens[2][1];
          if (nextOp) {
            this.assembly.push(`${this._mapArithmetic(opTok)} ${varName}, ${nextOp}`);
          }
        }
      }
    }

    if (left !== null && op !== null && right !== null) {
      this.assembly.push(`JMP L${startLbl}`);
      this.assembly.push(`L${endLbl}:`);
    }
    this.loopEndStack.pop();
  }

  funcDef() {
    this.advance(); // skip 'Ex'
    const name = this.cur[1];
    this.advance();
    this.match("LPAREN");
    while (this.cur && this.cur[0] !== "RPAREN") this.advance();
    this.match("RPAREN");
    this.assembly.push(`${name}:`);
    this.block();
    this.assembly.push(`RET`);
  }

  keywordCall() {
    const name = this.cur[1];
    this.advance();
    this.match("LPAREN");
    const args = [];
    while (this.cur && this.cur[0] !== "RPAREN") {
      if (this.cur[0] === "COMMA") { this.advance(); continue; }
      args.push(this.cur[1]);
      this.advance();
    }
    this.match("RPAREN");
    this.match("SEMICOLON");
    this.assembly.push(`CALL ${name}${args.length ? ", " + args.join(", ") : ""}`);
  }

  funcCall() {
    const fnName = this.cur[1];
    this.advance(); this.match("LPAREN");
    const args = [];
    while (this.cur && this.cur[0] !== "RPAREN") {
      if (this.cur[0] === "COMMA") { this.advance(); continue; }
      args.push(this.cur[1]);
      this.advance();
    }
    this.match("RPAREN");
    this.match("SEMICOLON");
    const fnEntry = this.symbolTable[fnName];
    if (fnEntry?.params) {
      fnEntry.params.forEach((param, idx) => {
        const arg = args[idx] ?? "0";
        this.assembly.push(`MOV ${param}, ${arg}`);
      });
    }
    this.assembly.push(`CALL ${fnName}`);
  }

  block() {
    this.match("LCURLY");
    while (this.cur && this.cur[0] !== "RCURLY") {
      this.statement();
    }
    this.match("RCURLY");
  }

  match(expected) {
    if (this.cur?.[0] === expected) this.advance();
    else this.advance();
  }

  _mapArithmetic(op) {
    if (op.includes("+")) return "ADD";
    if (op.includes("-")) return "SUB";
    if (op.includes("*")) return "MUL";
    if (op.includes("/")) return "DIV";
    if (op.includes("%")) return "MOD";
    return "ADD";
  }

  _mapCondJumpFalse(op) {
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

  _mapCondJumpTrue(op) {
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
