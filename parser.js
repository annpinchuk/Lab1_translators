const { lex } = require('./lexer');

function parse() {
  const { tableOfSymb, tableConst, tableIdents } = lex();
  let numRow = 0;
  let identLevel = 0;
  let postfixCode = [];
  let tableOfLabels = {};

  console.log('Таблиця символів', tableOfSymb);
  console.log('Таблиця констант');
  console.table(tableConst);
  console.log('Таблиця ідентифікаторів');
  console.table(tableIdents);

  /**
   * TODO: remove
   */
  function log() {
    console.log.apply(console.log, ['   '.repeat(identLevel), ...arguments]);
    identLevel++;
  }

  function parseToken(lex, tok) {
    const { line, lexeme, token } = getSymb();

    numRow++;

    if (lex === lexeme && tok === token) {
      log(`parseToken(): В рядку ${line} токен: ${lexeme} ${token}`);
      identLevel--;
      return true;
    }

    throw new Error(
      `В рядку ${line} неочікуваний елемент: ${token} ${lexeme}; очікувався: ${tok} ${lex}`,
    );
  }

  function getSymb() {
    if (numRow >= tableOfSymb.length) {
      throw new Error(
        `Неочікуваний кінець програми - в таблиці символів (розбору) немає запису з номером ${numRow}`,
      );
    }

    const [line, lexeme, token] = tableOfSymb[numRow];

    return {
      line,
      lexeme,
      token,
    };
  }

  function parseStatementList() {
    while (parseStatement());
  }

  function parseStatement() {
    if (numRow >= tableOfSymb.length) {
      return false;
    }

    const { line, lexeme, token } = getSymb();

    if (token === 'ident') {
      parseAssign();
      return true;
    } else if (token === 'keyword') {
      if (lexeme === 'if') {
        parseIf();
      } else if (lexeme === 'for') {
        parseFor();
      } else if (lexeme === 'read') {
        parseInp();
      } else if (lexeme === 'write') {
        parseOut();
      } else if (lexeme === 'rof') {
        return false;
      } else {
        parseDeclaration();
      }
      return true;
    } else if (lexeme === '}' && token === 'curve_brackets_op') {
      return false;
    } else {
      throw new Error(`В рядку ${line} неочікуваний елемент ${token} ${lexeme}`);
    }
  }

  function parseAssign() {
    log('parseAssign()');

    const { lexeme, token } = getSymb();

    postfixCode.push({ lexeme, token });
    numRow++;

    if (parseToken('=', 'assign_op')) {
      parseExpression();
      postfixCode.push({ lexeme: '=', token: 'assign_op' });
    }

    identLevel--;

    return { token, lexeme };
  }

  function parseDeclaration() {
    log('parseDeclaration()');

    const { line, lexeme, token } = getSymb();

    const dataTypes = ['integer', 'real', 'boolean'];

    if (token === 'keyword' && dataTypes.includes(lexeme)) {
      numRow++;
    } else {
      throw new Error(
        `В рядку ${line} неочікуваний елемент ${token} ${lexeme}; очікувався keyword ${dataTypes}`,
      );
    }

    postfixCode.push({ lexeme, token });

    const parseA = parseAssign();

    identLevel--;

    return parseA;
  }

  function createLabel() {
    let i = 1;
    let lexeme = '#m' + i;

    while (tableOfLabels[lexeme] !== undefined) {
      i++;
      lexeme = '#m' + i;
    }
    const label = { lexeme, token: 'label' };
    tableOfLabels[lexeme] = null;
    return label;
  }

  function setValLabel(lbl) {
    tableOfLabels[lbl.lexeme] = postfixCode.length;
  }

  function parseIf() {
    log('parseIf()');

    const { lexeme, token } = getSymb();

    if (lexeme === 'if' && token === 'keyword') {
      numRow++;

      parseBoolExpr();
      parseToken('{', 'curve_brackets_op');

      let m1 = createLabel();
      postfixCode.push(m1);
      postfixCode.push({ lexeme: 'JF', token: 'jf' });

      parseStatementList();
      parseToken('}', 'curve_brackets_op');
      setValLabel(m1);
      postfixCode.push(m1);
    }

    identLevel--;
  }

  function parseFor() {
    log('parseFor()');

    parseToken('for', 'keyword');
    const prm = parseDeclaration();
    parseToken('by', 'keyword');

    tableIdents.push({ lexeme: 'step', type: null, value: 0 });
    tableConst.push({ lexeme: '0', type: 'integer', value: 0 });

    const step = createLabel();
    const skipStep = createLabel();

    postfixCode.push(skipStep);
    postfixCode.push({ lexeme: 'JUMP', token: 'jump' });

    postfixCode.push(step);
    setValLabel(step);

    postfixCode.push({ lexeme: 'step', token: 'ident' });
    parseExpression();
    postfixCode.push({ lexeme: '=', token: 'assign_op' });

    parseToken('to', 'keyword');

    // prm step prm + =
    // prm = step + prm
    postfixCode.push(prm);
    postfixCode.push({ lexeme: 'step', token: 'ident' });
    postfixCode.push(prm);
    postfixCode.push({ lexeme: '+', token: 'add_op' });
    postfixCode.push({ lexeme: '=', token: 'assign_op' });

    postfixCode.push(skipStep);
    setValLabel(skipStep);

    // prm <= arithm
    // prm arithm <=

    postfixCode.push(prm);
    parseExpression();
    postfixCode.push({ lexeme: '<=', token: 'rel_op' });

    const end = createLabel();
    postfixCode.push(end);
    postfixCode.push({ lexeme: 'JF', token: 'jf' });

    parseToken('do', 'keyword');
    parseStatementList();
    parseToken('rof', 'keyword');

    postfixCode.push(step);
    postfixCode.push({ lexeme: 'JUMP', token: 'jump' });

    postfixCode.push(end);
    setValLabel(end);

    identLevel--;
  }

  function parseBoolExpr() {
    log('parseBoolExpr()');

    if (getSymb().token === 'boolean') {
      let { lexeme, token } = getSymb();
      postfixCode.push({ lexeme, token });
      numRow++;
      return true;
    }

    parseExpression();

    let { line, lexeme, token } = getSymb();

    if (token === 'rel_op') {
      numRow++;
    } else {
      throw new Error(`В рядку ${line} неочікуваний елемент для BoolExpr: ${token} ${lexeme}`);
    }

    parseExpression();

    postfixCode.push({ lexeme, token });

    if (getSymb().token === 'bool_op') {
      let { lexeme, token } = getSymb();
      numRow++;
      parseBoolExpr();
      postfixCode.push({ lexeme, token });
    }

    identLevel--;
  }

  function parseInp() {
    log('parseInp()');

    parseToken('read', 'keyword');
    parseToken('(', 'brackets_op');

    const { line, lexeme, token } = getSymb();
    postfixCode.push({ lexeme, token });

    if (token === 'ident') {
      numRow++;
    } else {
      throw new Error(
        `В рядку ${line} неочікуваний елемент для Inp: ${token} ${lexeme}, очікувався: Ident`,
      );
    }

    parseToken(')', 'brackets_op');
    postfixCode.push({ lexeme: 'READ', token: 'read' });

    identLevel--;
  }

  function parseOut() {
    log('parseOut()');

    parseToken('write', 'keyword');
    parseToken('(', 'brackets_op');

    const { line, lexeme, token } = getSymb();
    postfixCode.push({ lexeme, token });

    if (token === 'ident') {
      numRow++;
    } else {
      throw new Error(
        `В рядку ${line} неочікуваний елемент для Out: ${token} ${lexeme}, очікувався: Ident`,
      );
    }

    parseToken(')', 'brackets_op');
    postfixCode.push({ lexeme: 'WRITE', token: 'write' });

    identLevel--;
  }

  function parseExpression() {
    log('parseExpression()');
    let { token, lexeme } = getSymb();

    if (getSymb().token === 'boolean') {
      postfixCode.push({ lexeme, token });
      numRow++;
      identLevel--;
      return;
    }

    let isUnaryMinus = false;

    if (getSymb().lexeme === '-') {
      numRow++;
      isUnaryMinus = true;
    }

    parseTerm();

    if (isUnaryMinus) {
      postfixCode.push({ lexeme: '@', token: 'unary_minus' });
    }

    while (numRow < tableOfSymb.length) {
      const { lexeme, token } = getSymb();

      if (token !== 'add_op') break;

      numRow++;

      parseTerm();

      postfixCode.push({ lexeme, token });
    }

    identLevel--;
  }

  function parseTerm() {
    log('parseTerm()');

    parseFactor();

    while (numRow < tableOfSymb.length) {
      const { lexeme, token } = getSymb();

      if (!['mult_op', 'pow_op'].includes(token)) break;

      numRow++;

      parseFactor();

      postfixCode.push({ lexeme, token });
    }

    identLevel--;
  }

  function parseFactor() {
    log('parseFactor()');

    const { line, lexeme, token } = getSymb();

    if (['integer', 'real', 'ident'].includes(token)) {
      postfixCode.push({ lexeme, token });
      numRow++;
      // log(`В рядку ${line}: ${token} ${lexeme}`);
    } else if (lexeme === '(') {
      numRow++;
      parseExpression();
      parseToken(')', 'brackets_op');
    } else {
      throw new Error(`В рядку ${line} неочікуваний елемент для Factor: ${token} ${lexeme}`);
    }

    identLevel--;
  }

  function parseProgram() {
    parseToken('program', 'keyword');

    const { line, lexeme, token } = getSymb();

    if (token === 'ident') {
      numRow++;
    } else {
      throw new Error(`В рядку ${line} неочікуваний елемент: ${token} ${lexeme}; очікувався Ident`);
    }

    parseToken('{', 'curve_brackets_op');
    parseStatementList();
    parseToken('}', 'curve_brackets_op');
  }

  parseProgram();

  console.log('Таблиця міток');
  console.table(tableOfLabels);

  console.table(postfixCode);
  console.log(postfixCode.map(row => row.lexeme).join(' '));

  return { tableOfSymb, tableConst, tableIdents, postfixCode, tableOfLabels };
}

// if (parse()) {
//   console.log('\nСинтаксичний аналіз завершено успішно');
// }

module.exports = { parse };
