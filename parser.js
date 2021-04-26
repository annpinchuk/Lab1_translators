const { lex } = require('./lexer');

function parse() {
  const { tableOfSymb, tableConst, tableIdents } = lex();
  let numRow = 0;
  let identLevel = 0;
  let postfixCode = [];

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

    parseAssign();

    identLevel--;
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
  }

  function parseIf() {
    log('parseIf()');

    const { lexeme, token } = getSymb();

    if (lexeme === 'if' && token === 'keyword') {
      numRow++;

      parseBoolExpr();
      parseToken('{', 'curve_brackets_op');
      parseStatementList();
      parseToken('}', 'curve_brackets_op');
    }

    identLevel--;
  }

  function parseFor() {
    log('parseFor()');

    parseToken('for', 'keyword');
    parseDeclaration();
    parseToken('by', 'keyword');
    parseExpression();
    parseToken('to', 'keyword');
    parseExpression();
    parseToken('do', 'keyword');
    parseStatementList();
    parseToken('rof', 'keyword');

    identLevel--;
  }

  function parseBoolExpr() {
    log('parseBoolExpr()');

    if (getSymb().token === 'boolval') {
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

    if (getSymb().token === 'bool_op') {
      numRow++;
      parseBoolExpr();
    }

    identLevel--;
  }

  function parseInp() {
    log('parseInp()');

    parseToken('read', 'keyword');
    parseToken('(', 'brackets_op');

    const { line, lexeme, token } = getSymb();

    if (token === 'ident') {
      numRow++;
    } else {
      throw new Error(
        `В рядку ${line} неочікуваний елемент для Inp: ${token} ${lexeme}, очікувався: Ident`,
      );
    }

    parseToken(')', 'brackets_op');

    identLevel--;
  }

  function parseOut() {
    log('parseOut()');

    parseToken('write', 'keyword');
    parseToken('(', 'brackets_op');

    const { line, lexeme, token } = getSymb();

    if (token === 'ident') {
      numRow++;
    } else {
      throw new Error(
        `В рядку ${line} неочікуваний елемент для Out: ${token} ${lexeme}, очікувався: Ident`,
      );
    }

    parseToken(')', 'brackets_op');

    identLevel--;
  }

  function parseExpression() {
    log('parseExpression()');

    if (getSymb().token === 'boolval') {
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

  console.table(postfixCode);
  console.log(postfixCode.map(row => row.lexeme).join(' '));

  return { tableOfSymb, tableConst, tableIdents, postfixCode };
}

// if (parse()) {
//   console.log('\nСинтаксичний аналіз завершено успішно');
// }

module.exports = { parse };
