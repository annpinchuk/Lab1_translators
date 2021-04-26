const { parse } = require('./parser');

function interpreter() {
  const { postfixCode, tableConst, tableIdents } = parse();
  let stack = [];
  for (let i = 0; i < postfixCode.length; i++) {
    const { lexeme, token } = postfixCode[i];
    if (['integer', 'real', 'ident', 'keyword'].includes(token)) {
      stack.push({ lexeme, token });
    } else {
      doIt(lexeme, token);
    }
  }

  function doIt(lexeme, token) {
    if (lexeme === '=' && token === 'assign_op') {
      // зняти з вершини стека запис (правий операнд = число)
      const left = stack.pop();
      //зняти з вершини стека iдентифiкатор (лiвий операнд)
      const right = stack.pop();
      const type = stack.pop();

      for (let i = 0; i < tableIdents.length; i++) {
        if (tableIdents[i].lexeme === right.lexeme) {
          const constInfo = findConstant(left.lexeme);

          const isAssign = tableIdents[i].type === null && tableIdents[i].value === null;

          if (isAssign) {
            if (!type) {
              throw new Error(`Variable ${right.lexeme} assign before declaration`);
            }

            if (type.lexeme !== constInfo.type) {
              throw new Error(
                `Incompatible type to assign ${constInfo.type} to ${type.lexeme} ${right.lexeme}`,
              );
            }
          } else {
            if (tableIdents[i].type !== constInfo.type) {
              throw new Error(
                `Incompatible type to assign ${constInfo.type} to ${tableIdents[i].type} ${tableIdents[i].lexeme}`,
              );
            }
          }

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
    } else if (lexeme === '@' && token === 'unary_minus') {
      const entry = stack.pop();

      const value = -entry.lexeme;
      const lexeme = value.toString();
      const token = entry.token;

      stack.push({ lexeme, token });

      if (tableConst.findIndex(row => row.lexeme === lexeme) === -1) {
        tableConst.push({ type: token, value, lexeme });
      }
    }
  }

  function processing_add_mult_op(left, lexeme, right) {
    if (left.token === 'ident') {
      const identInfo = findIdentifier(left.lexeme);

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
      left.value = findConstant(left.lexeme).value;
    }

    if (right.token === 'ident') {
      const identInfo = findIdentifier(right.lexeme);

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
      right.value = findConstant(right.lexeme).value;
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
          `Ділення на нуль ` + JSON.stringify(left) + ` ` + lexeme + ` ` + JSON.stringify(right),
        );
      }

      result = Math.round(left.value / right.value);
    } else if (lexeme === '^') {
      result = Math.pow(left.value, right.value);
    }

    stack.push({ lexeme: result.toString(), token: left.token });

    if (tableConst.findIndex(row => row.lexeme === lexeme) === -1) {
      tableConst.push({ type: left.token, value: result, lexeme: result.toString() });
    }
  }

  function findConstant(lexeme) {
    const info = tableConst.find(row => row.lexeme === lexeme);

    if (info === undefined) {
      throw new Error(`Константу за лексемою ${lexeme} не знайдено`);
    }

    return info;
  }

  function findIdentifier(lexeme) {
    const info = tableIdents.find(row => row.lexeme === lexeme);

    if (info === undefined) {
      throw new Error(`Ідентифікатор за лексемою ${lexeme} не знайдено`);
    }

    return info;
  }

  console.log('Таблиця ідентифікаторів');
  console.table(tableIdents);
  console.log('Таблиця констант');
  console.table(tableConst);
}

interpreter();
