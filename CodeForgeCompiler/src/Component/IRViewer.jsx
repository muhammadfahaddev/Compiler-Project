import React from 'react';

// IRViewer.jsx
// Displays three-address code in a styled, collapsible format.
export default function IRViewer({ ir }) {
  if (!ir || !ir.length) return <div className="text-gray-500">No IntermediateCodeGenerator</div>;

  return (
    <div className="bg-white shadow rounded p-4">
      <h2 className="text-xl font-semibold mb-2">Intermediate Code Generator</h2>
      <ul className="font-mono text-sm space-y-1">
        {ir.map((instr, idx) => {
          const { op, arg1, arg2, result } = instr;
          let line = '';
          switch(op) {
            case 'assign': line = `${result} = ${arg1}`; break;
            case 'label':  line = `${result}:`; break;
            case 'ret':    line = `ret`; break;
            case 'goto':   line = `goto ${result}`; break;
            default:
              if (op.startsWith('ifFalse')) {
                const condOp = op.split(' ')[1];
                line = `ifFalse ${arg1} ${condOp} ${arg2} goto ${result}`;
              } else if (op === 'call') {
                line = `call ${arg1}, ${arg2}`;
              } else if (op === 'param') {
                line = `param ${arg1}`;
              } else {
                // binary temp
                line = `${result} = ${arg1} ${op} ${arg2}`;
              }
          }
          return (
            <li key={idx} className="px-2 py-1 rounded hover:bg-gray-100">
              {line}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
