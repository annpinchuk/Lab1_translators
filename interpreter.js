const prompt = require('prompt-sync')();
const { parse } = require('./parser');

function interpreter() {
  const { postfixCode, tableConst, tableIdents, tableOfLabels } = parse();
  let stack = [];
  for (let i = 0; i < postfixCode.length; ) {
    const { lexeme, token } = postfixCode[i];
    if (['integer', 'real', 'boolean', 'ident', 'keyword', 'label'].includes(token)) {
      stack.push({ lexeme, token });
      i++;
    } else if (['jump', 'jf'].includes(token)) {
      i = doJump(token, i);
    } else {
      doIt(lexeme, token);
      i++;
    }
  }

  function doJump(token, i) {
    switch (token) {
      case 'jump': {
        const lbl = stack.pop();
        if (tableOfLabels[lbl.lexeme] === undefined) {
          throw new Error(`Мітку ${lbl.lexeme} не знайдено`);
        }

        return tableOfLabels[lbl.lexeme];
      }
      case 'jf': {
        const lbl = stack.pop();
        const boolExpr = stack.pop();
        if (boolExpr.lexeme === 'false') {
          if (tableOfLabels[lbl.lexeme] === undefined) {
            throw new Error(`Мітку ${lbl.lexeme} не знайдено`);
          }

          return tableOfLabels[lbl.lexeme];
        }
        return i + 1;
      }
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

            if (type.lexeme !== left.token) {
              throw new Error(
                `Incompatible type to assign ${left.token} to ${type.lexeme} ${right.lexeme}`,
              );
            }
          } else {
            if (tableIdents[i].type !== null && tableIdents[i].type !== left.token) {
              throw new Error(
                `Incompatible type to assign ${left.token} to ${tableIdents[i].type} ${tableIdents[i].lexeme}`,
              );
            }
          }

          tableIdents[i].type = left.token;
          tableIdents[i].value = constInfo.value;
        }
      }
    } else if (['add_op', 'mult_op', 'rel_op', 'bool_op', 'pow_op'].includes(token)) {
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
    } else if (token === 'write') {
      const { lexeme } = stack.pop();
      const idnt = findIdentifier(lexeme);

      console.log(`\t ${idnt.lexeme} = ${idnt.value}`);
    } else if (token === 'read') {
      const { lexeme } = stack.pop();
      const idnt = findIdentifier(lexeme);

      let input = prompt(`Введіть будь ласка ${idnt.lexeme} з типом ${idnt.type}: `);

      if (idnt.type === 'integer') {
        input = parseInt(input);
      } else if (idnt.type === 'real') {
        input = parseFloat(input);
      } else if (idnt.type === 'boolean') {
        input = input === 'true' || input === '1';
      }

      if (Number.isNaN(input)) {
        throw new Error(`Неправильно введене значення`);
      }
      idnt.value = input;
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
    } else if (lexeme === '>') {
      result = left.value > right.value;
    } else if (lexeme === '<') {
      result = left.value < right.value;
    } else if (lexeme === '>=') {
      result = left.value >= right.value;
    } else if (lexeme === '<=') {
      result = left.value <= right.value;
    } else if (lexeme === '==') {
      result = left.value === right.value;
    } else if (lexeme === '!=') {
      result = left.value !== right.value;
    } else if (lexeme === '&&') {
      result = left.value && right.value;
    } else if (lexeme === '||') {
      result = left.value || right.value;
    } else {
      throw new Error(`Невідомий оператор: ${lexeme}`);
    }

    stack.push({ lexeme: result.toString(), token: left.token });

    if (tableConst.findIndex(row => row.lexeme === result.toString()) === -1) {
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
