const { parse } = require('./parser');

function interpreter() {
  const { postfixCode, tableOfSymb, tableConst, tableIdents } = parse();
  let stack = [];
  for (let i = 0; i < postfixCode.length; i++) {
    const { lexeme, token } = postfixCode[i];
    if (['integer', 'real', 'ident'].includes(token)) {
      stack.push({ lexeme, token });
    } else {
      doIt(lexeme, token);
    }
  }

  //TODO
  function doIt(lexeme, token) {
    if (lexeme === '=' && token === 'assign_op') {
      // зняти з вершини стека запис (правий операнд = число)
      const left = stack.pop();
      //зняти з вершини стека iдентифiкатор (лiвий операнд)
      const right = stack.pop();

      for (let i = 0; i < tableIdents.length; i++) {
        if (tableIdents[i].lexeme === right.lexeme) {
          const constInfo = findConst(left.lexeme);
          tableIdents[i].type = constInfo.type;
          tableIdents[i].value = constInfo.value;
        }
      }
    } else if (['add_op', 'mult_op', 'pow_op'].includes(token)) {
      // зняти з вершини стека запис (правий операнд)
      const right = stack.pop();
      // зняти з вершини стека запис (лiвий операнд)
      const left = stack.pop();

      processing_add_mult_op(left, lexeme, right);
      //TODO
    }
  }

  function processing_add_mult_op(left, lexeme, right) {
    if (left.token === 'ident') {
      const identInfo = findId(left.lexeme);

      if (identInfo.type === null) {
        throw new Error(
          `Неініціалізована змінна ` +
            left.lexeme +
            ` ` +
            JSON.stringify(left) +
            ` ` +
            lexeme +
            ` ` +
            JSON.stringify(right),
        );
      }

      left.value = identInfo.value;
      left.token = identInfo.type;
    } else {
      left.value = findConst(left.lexeme).value;
    }

    if (right.token === 'ident') {
      const identInfo = findId(right.lexeme);

      if (identInfo.type === null) {
        throw new Error(
          `Неініціалізована змінна ` +
            right.lexeme +
            ` ` +
            JSON.stringify(left) +
            ` ` +
            lexeme +
            ` ` +
            JSON.stringify(right),
        );
      }
      right.value = identInfo.value;
      right.token = identInfo.type;
    } else {
      right.value = findConst(right.lexeme).value;
    }
    getValue(left, lexeme, right);
  }

  function getValue(left, lexeme, right) {
    let result;

    if (left.token !== right.token) {
      throw new Error(
        `Невідповідність типів: ` +
          JSON.stringify(left) +
          ` ` +
          lexeme +
          ` ` +
          JSON.stringify(right),
      );
    } else if (lexeme === '+') {
      result = left.value + right.value;
    } else if (lexeme === '-') {
      result = left.value - right.value;
    } else if (lexeme === '*') {
      result = left.value * right.value;
    } else if (lexeme === '/') {
      if (right.value === 0) {
        throw new Error(
          `Невідповідність типів: ` +
            JSON.stringify(left) +
            ` ` +
            lexeme +
            ` ` +
            JSON.stringify(right),
        );
      }

      result = left.value / right.value;
    } else if (lexeme === '^') {
      result = Math.pow(left.value, right.value);
    }

    stack.push({ lexeme: result.toString(), token: left.token });

    if (tableConst.findIndex(row => row.lexeme === lexeme) === -1) {
      tableConst.push({ type: left.token, value: result, lexeme: result.toString() });
    }
  }

  function findConst(lexeme) {
    const row = tableConst.find(row => row.lexeme === lexeme);

    if (row === undefined) {
      throw new Error(`Константу за лексемою ${lexeme} не знайдено`);
    }

    return row;
  }

  function findId(lexeme) {
    const row = tableIdents.find(row => row.lexeme === lexeme);

    if (row === undefined) {
      throw new Error(`Ідентифікатор за лексемою ${lexeme} не знайдено`);
    }

    return row;
  }

  console.table(tableIdents);
  console.table(tableConst);
}

interpreter();
