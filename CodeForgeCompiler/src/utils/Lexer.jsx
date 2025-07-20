// src/utils/Lexer.js
const dataTypes = ["nmb", "flat", "Sring", "buul", "cter"];
const loopKeywords = ["first", "wish", "last", "brk"];
const funcKeywords = ["Ex", "rat", "enter", "printO"];
const otherKeywords = ["oye", "naioye", "chaloye", "resume", "stop"];
const keywords = [...dataTypes, ...loopKeywords, ...funcKeywords, ...otherKeywords];

const operators = [
  "==.", "!=.", ">=.", "<=.", 
  "+.", "-.", "*.", "/.", "%.",
   ">.", "<."
];
const assignmentOperators = ["=."];
const punctuationPatterns = [
  ["LCURLY", /^\{/], ["RCURLY", /^\}/],
  ["LPAREN", /^\(/], ["RPAREN", /^\)/],
  ["SEMICOLON", /^;/], ["COMMA", /^,/]
];

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildPattern(arr) {
  const escaped = arr.map(escapeRegex).sort((a, b) => b.length - a.length);
  return new RegExp(`^(${escaped.join('|')})`);
}

const tokenTypes = [
  ["COMMENT", /^\/\/.*$/],
  ["DATA_TYPE", buildPattern(dataTypes)],
  ["KEYWORD", buildPattern(keywords)],
  ["NUMBER", /^\d+(?:\.\d+)?\b/],
  ["STRING", /^"(?:[^"\\]|\\.)*"/],
  ["BOOLEAN", /^(?:true|false)\b/],
  ["OPERATOR", buildPattern(operators)],
  ["ASSIGN", buildPattern(assignmentOperators)],
  ...punctuationPatterns,
  ["IDENTIFIER", /^[A-Za-z_]\w*/]
];

export default function tokenize(code) {
  const errors = [];
  const tokens = [];
  code.split("\n").forEach((line, row) => {
    let pos = 0;
    while (pos < line.length) {
      if (/\s/.test(line[pos])) { pos++; continue; }
      let matched = false;
      const slice = line.slice(pos);
      for (const [type, regex] of tokenTypes) {
        const m = slice.match(regex);
        if (m && m.index === 0) {
          matched = true;
          const txt = m[0];
          if (type !== 'COMMENT') tokens.push([type, txt, row + 1]);
          pos += txt.length;
          break;
        }
      }
      if (!matched) {
        const unknownChar = line[pos];
        tokens.push(["UNKNOWN", unknownChar, row + 1]);
        errors.push(`Lexical error: Unexpected '${unknownChar}' at line ${row + 1}`);
        pos++;
      }
    }
  });
  return { tokens, errors };
}

export { funcKeywords };
