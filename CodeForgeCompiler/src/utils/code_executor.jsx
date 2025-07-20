// src/utils/code_executor.jsx
import React, { useState, useEffect } from 'react';

export class AssemblyInterpreter {
  constructor() {
    this.variables = {};
    this.labels = {};
    this.program_counter = 0;
    this.stack = [];
    this.callStack = [];
    this.output = [];
    this.maxSteps = 1e5;
  }

  execute(code) {
    const instructions = code.split("\n");
    this._preprocessLabels(instructions);
    this.program_counter = 0;
    this.output = [];
    this.stack = [];
    this.callStack = [];

    let steps = 0;
    while (this.program_counter < instructions.length) {
      if (++steps > this.maxSteps) {
        throw new Error("Infinite loop detected");
      }
      const line = instructions[this.program_counter].trim();
      if (!line || line.endsWith(":")) {
        this.program_counter++;
        continue;
      }
      this._executeInstruction(line);
      this.program_counter++;
    }
    return this.output;
  }

  _preprocessLabels(instrs) {
    instrs.forEach((ln, i) => {
      const t = ln.trim();
      if (t.endsWith(":")) this.labels[t.slice(0, -1)] = i;
    });
  }

  _getVal(tok) {
    const t = tok.replace(/,$/, "");
    // literal string
    if (/^".*"$/.test(t)) return t.slice(1, -1);
    // integer
    if (/^-?\d+$/.test(t)) return parseInt(t, 10);
    // float
    if (/^-?\d+\.\d+$/.test(t)) return parseFloat(t);
    // boolean literal?
    if (t === "true") return true;
    if (t === "false") return false;
    // variable
    return this.variables[t] ?? 0;
  }

  _mov(dest, src) {
    const d = dest.replace(/,$/, "");
    this.variables[d] = this._getVal(src);
  }

  _binary(dest, src, fn) {
    const d = dest.replace(/,$/, "");
    const a = this.variables[d] ?? 0;
    const b = this._getVal(src);
    this.variables[d] = fn(a, b);
  }

  _cmp(a, b) {
    this.stack.push([this._getVal(a), this._getVal(b)]);
  }

  _jump(op, label) {
    const [l, r] = this.stack.pop() || [0, 0];
    const ok = { JMP: true, JE: l === r, JNE: l !== r, JL: l < r, JG: l > r, JGE: l >= r, JLE: l <= r }[op];
    if (ok) this.program_counter = this.labels[label] - 1;
  }

  _call(fnToken, args) {
    const fn = fnToken.replace(/,$/, "");
    // built-ins:
    if (fn === "printO") {
      this.output.push(args.map(a => this._getVal(a)).join(" "));
      return;
    }
    if (fn === "rat" || fn === "showout") {
      // similarly treat as print
      this.output.push(args.map(a => this._getVal(a)).join(" "));
      return;
    }
    if (fn === "enter") {
      // args: [ promptString, typeLiteral?, varName? ]
      // e.g., CALL enter, "Enter a number:", nmb, num
      const promptMsg = this._getVal(args[0]);
      let userInput = prompt(promptMsg);
      if (userInput === null) {
        userInput = ""; // user cancelled
      }
      // Determine type and varName if provided
      if (args.length >= 3) {
        const typeTok = args[1]; // e.g. 'nmb' or 'flat' or 'Sring' or 'buul'
        const varName = args[2];
        let parsed;
        if (typeTok === "nmb") {
          parsed = parseInt(userInput, 10);
          if (isNaN(parsed)) parsed = 0;
        } else if (typeTok === "flat") {
          parsed = parseFloat(userInput);
          if (isNaN(parsed)) parsed = 0;
        } else if (typeTok === "Sring") {
          parsed = userInput;
        } else if (typeTok === "buul") {
          const low = userInput.trim().toLowerCase();
          parsed = (low === "true" || low === "1");
        } else {
          // fallback: string
          parsed = userInput;
        }
        this.variables[varName] = parsed;
      } else if (args.length === 2) {
        // maybe syntax: CALL enter, "msg", varName
        const varName = args[1];
        // Try to detect existing var type
        let parsed = userInput;
        // no type info: store string
        this.variables[varName] = parsed;
      }
      return;
    }
    // user function: push return address
    this.callStack.push(this.program_counter);
    this.program_counter = this.labels[fn] - 1;
  }

  _ret() {
    if (!this.callStack.length) this.program_counter = Infinity;
    else this.program_counter = this.callStack.pop();
  }

  _executeInstruction(line) {
    if (line.startsWith("CALL ")) {
      const parts = line.slice(5).split(",").map(s => s.trim());
      return this._call(parts[0], parts.slice(1));
    }
    const [op, a, b] = line.split(/\s+/);
    switch (op) {
      case "MOV": return this._mov(a, b);
      case "ADD": return this._binary(a, b, (x, y) => x + y);
      case "SUB": return this._binary(a, b, (x, y) => x - y);
      case "MUL": return this._binary(a, b, (x, y) => x * y);
      case "DIV": return this._binary(a, b, (x, y) => {
        if (y === 0) throw new Error("Division by zero");
        return Math.floor(x / y);
      });
      case "MOD": return this._binary(a, b, (x, y) => {
        if (y === 0) throw new Error("Modulo by zero");
        return x % y;
      });
      case "CMP": return this._cmp(a, b);
      case "JMP": case "JE": case "JNE": case "JL": case "JG": case "JGE": case "JLE":
        return this._jump(op, a);
      case "RET": return this._ret();
      default:
        throw new Error(`Unknown instr: ${line}`);
    }
  }
}

export default function CodeExecutor({ assembly }) {
  const [output, setOutput] = useState([]);

  useEffect(() => {
    if (!assembly) {
      setOutput([]);
      return;
    }
    try {
      const interp = new AssemblyInterpreter();
      const out = interp.execute(assembly);
      setOutput(out);
    } catch (e) {
      setOutput([e.message]);
    }
  }, [assembly]);

  return (
    <div className="p-4 bg-gray-50 rounded">
      <h2 className="font-semibold mb-2">Program Output</h2>
      <pre className="font-mono bg-white p-2 rounded">
        {output.length ? output.join("\n") : "No output"}
      </pre>
    </div>
  );
}
