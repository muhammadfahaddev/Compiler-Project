
export default function buildSymbolTable(tokens, builtIns) {
  const table = {};
  let pendingType = null;

  for (let i = 0; i < tokens.length; i++) {
    const [type, lexeme, line] = tokens[i];

    // 1) DATA_TYPE indicates upcoming variable declaration
    if (type === 'DATA_TYPE') {
      pendingType = lexeme;
      continue;
    }

    // 2) Variable declaration: IDENTIFIER after DATA_TYPE
    if (type === 'IDENTIFIER' && pendingType) {
      if (!table[lexeme]) {
        table[lexeme] = {
          token_type: 'VARIABLE',
          data_type: pendingType,
          line_number: line,
          value: null
        };
      }
      // capture initializer literal if present
      const nxt1 = tokens[i + 1];
      const nxt2 = tokens[i + 2];
      if (
        nxt1?.[0] === 'ASSIGN' &&
        nxt2 && ['NUMBER','STRING','BOOLEAN'].includes(nxt2[0])
      ) {
        table[lexeme].value = nxt2[1];
      }
      pendingType = null;
      continue;
    }

    // 3) Loop initialization: first(nmb i =. start; ...)
    if (type === 'KEYWORD' && lexeme === 'first') {
      // expect '(', DATA_TYPE, IDENTIFIER, ASSIGN, literal/ident, ';'
      if (
        tokens[i+1]?.[0] === 'LPAREN' &&
        tokens[i+2]?.[0] === 'DATA_TYPE' &&
        tokens[i+3]?.[0] === 'IDENTIFIER' &&
        tokens[i+4]?.[0] === 'ASSIGN' &&
        tokens[i+5] && ['NUMBER','IDENTIFIER'].includes(tokens[i+5][0])
      ) {
        const dt = tokens[i+2][1];
        const name = tokens[i+3][1];
        const initVal = tokens[i+5][1];
        if (!table[name]) {
          table[name] = {
            token_type: 'VARIABLE',
            data_type: dt,
            line_number: tokens[i+3][2],
            value: initVal
          };
        }
      }
    }

    // 4) Function definition: 'Ex' keyword
    if (type === 'KEYWORD' && lexeme === 'Ex') {
      const next = tokens[i+1];
      if (next?.[0] === 'IDENTIFIER') {
        const fnName = next[1], fnLine = next[2];
        const params = [];
        let j = i + 2;
        // find '('
        while (j < tokens.length && tokens[j][0] !== 'LPAREN') j++;
        if (tokens[j]?.[0] === 'LPAREN') {
          j++;
          while (j + 1 < tokens.length && tokens[j][0] !== 'RPAREN') {
            const [t1] = tokens[j];
            const [t2, lex2] = tokens[j+1] || [];
            if (t1 === 'DATA_TYPE' && t2 === 'IDENTIFIER') {
              params.push(lex2);
              j += 2;
            } else j++;
          }
        }
        table[fnName] = { token_type:'FUNCTION', data_type:'function', params, line_number:fnLine, value:null };
      }
      continue;
    }

    // 5) Input statement 'enter("msg", nmb var);'
    if (type === 'KEYWORD' && lexeme === 'enter') {
      // pattern: enter, LPAREN, STRING, COMMA, DATA_TYPE, IDENTIFIER, RPAREN
      const dt = tokens[i+4];
      const id = tokens[i+5];
      if (dt?.[0]==='DATA_TYPE' && id?.[0]==='IDENTIFIER') {
        table[id[1]] = {
          token_type: 'VARIABLE',
          data_type: dt[1],
          line_number: id[2],
          value: null
        };
      }
      continue;
    }
  }

  // 6) Register built-in functions
  builtIns.forEach(fn => {
    if (!table[fn]) {
      table[fn] = { token_type:'FUNCTION', data_type:'function', params:[], line_number:null, value:null };
    }
  });

  return table;
}
