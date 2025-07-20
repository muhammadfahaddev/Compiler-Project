// src/components/CodeForgeLexer.jsx
import React, { useState } from 'react';

// Define token specs in order (longest operators first)
const TOKEN_SPECS = [
  ['COMMENT',       /@.*/y],
  ['KEYWORD',       /\b(?:oye|naioye|chaloye|first|wish|last|brk|Ex|rat|enter|printO|option|pick|autopick|nmb|flat|Sring|buul|cter)\b/y],
  ['DATA_TYPE',     /\b(?:integer|decimal|line|flag|single)\b/y],
  ['OPERATOR',      /\+\+\.|\-\-\.|<=\.|>=\.|==\.|!=\.|\+\.\-\.|\+\.|\-\.|\*\.|\/\.|%\.\b|>\.|\<\./y],
  ['ASSIGN',        /=\.?/y],
  ['LCURLY',        /\{/y],
  ['RCURLY',        /\}/y],
  ['LPAREN',        /\(/y],
  ['RPAREN',        /\)/y],
  ['STATEMENT_END', /!/y],
  ['SEPARATOR',     /,/y],
  ['CONSTANT',      /"(?:[^"]*)"|'(?:[^']*)'/y],
  ['LITERAL',       /\b(?:true|false|-?\d+\.\d*|-?\d+)\b/y],
  ['Identifier',    /[A-Za-z][A-Za-z0-9]*/y],
  ['MISMATCH',      /./y],
];

export default function CodeForgeLexer() {
  const [code, setCode] = useState('');
  const [tokens, setTokens] = useState([]);
  const [errors, setErrors] = useState([]);

  function tokenize(input) {
    const toks = [];
    const errs = [];
    const lines = input.split('\n');

    lines.forEach((line, lineNo) => {
      let pos = 0;
      while (pos < line.length) {
        if (/\s/.test(line[pos])) {
          pos++;
          continue;
        }
        let matched = false;
        for (const [type, reBase] of TOKEN_SPECS) {
          const re = new RegExp(reBase.source, 'y');
          re.lastIndex = pos;
          const m = re.exec(line);
          if (!m) continue;
          matched = true;
          const txt = m[0];
          if (type === 'COMMENT') {
            // skip
          } else if (type === 'MISMATCH') {
            errs.push({ msg: `Unexpected '${txt}'`, line: lineNo + 1 });
          } else if (type === 'Identifier') {
            // peek ahead for '('
            let fnType = 'VARIABLE';
            const after = line.slice(pos + txt.length).trimStart();
            if (after.startsWith('(')) fnType = 'FUNCTION';
            toks.push({ type: fnType, value: txt, line: lineNo + 1 });
          } else {
            toks.push({ type, value: txt, line: lineNo + 1 });
          }
          pos += txt.length;
          break;
        }
        if (!matched) {
          // should never happen
          errs.push({ msg: `Cannot tokenize at pos ${pos}`, line: lineNo + 1 });
          break;
        }
      }
    });

    return [toks, errs];
  }

  const run = () => {
    const [toks, errs] = tokenize(code);
    setTokens(toks);
    setErrors(errs);
  };

  const clear = () => {
    setCode('');
    setTokens([]);
    setErrors([]);
  };

  return (
    <div className="p-6 bg-gray-900 text-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">CodeForge Lexer</h1>
      <textarea
        className="w-full h-32 bg-gray-800 p-3 rounded mb-4 font-mono"
        placeholder="Paste your CodeForge code here…"
        value={code}
        onChange={e => setCode(e.target.value)}
      />
      <div className="flex gap-2 mb-6">
        <button onClick={run} className="px-4 py-2 bg-teal-600 rounded hover:bg-teal-500">
          Run Lexer
        </button>
        <button onClick={clear} className="px-4 py-2 bg-red-600 rounded hover:bg-red-500">
          Clear
        </button>
      </div>

      {errors.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-red-400 mb-2">Errors</h2>
          <ul className="list-disc list-inside text-red-300">
            {errors.map((e,i) => (
              <li key={i}>Line {e.line}: {e.msg}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-2">Tokens</h2>
        <table className="w-full table-auto bg-gray-800 rounded">
          <thead>
            <tr className="bg-gray-700">
              <th className="px-3 py-2 text-left">Line</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Value</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((t, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700'}>
                <td className="px-3 py-1">{t.line}</td>
                <td className="px-3 py-1">{t.type}</td>
                <td className="px-3 py-1 font-mono">{t.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
