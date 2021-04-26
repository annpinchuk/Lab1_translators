const fs = require('fs');

const tokens = {
  true: 'boolval',
  false: 'boolval',
  program: 'keyword',
  integer: 'keyword',
  real: 'keyword',
  boolean: 'keyword',
  read: 'keyword',
  write: 'keyword',
  if: 'keyword',
  for: 'keyword',
  by: 'keyword',
  to: 'keyword',
  do: 'keyword',
  rof: 'keyword',
  '=': 'assign_op',
  '-': 'add_op',
  '+': 'add_op',
  '*': 'mult_op',
  '/': 'mult_op',
  '^': 'pow_op',
  '>': 'rel_op',
  '<': 'rel_op',
  '<=': 'rel_op',
  '>=': 'rel_op',
  '==': 'rel_op',
  '!=': 'rel_op',
  '&&': 'bool_op',
  '||': 'bool_op',
  '.': 'dot',
  ' ': 'ws',
  '\n': 'nl',
  '(': 'brackets_op',
  ')': 'brackets_op',
  '{': 'curve_brackets_op',
  '}': 'curve_brackets_op',
};

const tableIdentRealInteger = { 2: 'ident', 6: 'real', 9: 'integer' };

const stf = [
  [0, 'Letter', 1],
  [1, 'Letter', 1],
  [1, 'Digit', 1],
  [1, 'other', 2],
  [0, 'Digit', 4],
  [4, 'Digit', 4],
  [4, 'dot', 5],
  [4, 'other', 9],
  [5, 'Digit', 5],
  [5, 'other', 6],
  [0, 'ws', 0],
  [0, 'nl', 13],
  [0, '+', 14],
  [0, '-', 14],
  [0, '*', 14],
  [0, '/', 14],
  [0, '^', 14],
  [0, '(', 14],
  [0, ')', 14],
  [0, '{', 14],
  [0, '}', 14],
  [0, '!', 8],
  [8, '=', 19],
  [8, 'other', 102],
  [0, '>', 7],
  [0, '<', 7],
  [0, '=', 7],
  [7, '=', 11],
  [7, 'other', 12],
  [0, '|', 15],
  [15, '|', 16],
  [15, 'other', 104],
  [0, '&', 17],
  [17, '&', 18],
  [17, 'other', 103],
  [0, 'other', 101],
];

const states = {
  newLine: [13],
  star: [2, 6, 9, 12],
  error: [101, 102, 103, 104],
  operators: [11, 12, 16, 14, 18, 19],
  double_operators: [11, 16, 18, 19],
  const: [6, 9],
  ident: [2],
  final: [2, 6, 9, 11, 12, 13, 14, 16, 18, 19, 101, 102, 103, 104],
};

const errorMessages = {
  101: () => `Невідомий символ "${char}" в рядку ${line}`,
  102: () => `Очікувався "=" після "!" в рядку ${line}`,
  103: () => `Очікувався "&" після "&" в рядку ${line}`,
  104: () => `Очікувався "|" після "|" в рядку ${line}`,
};

const initState = 0; // q0 - стартовий стан

let state = initState,
  line = 1,
  charIndex = 0,
  char = '',
  lexeme = '';

let tableIdents = [];
let tableConst = [];
let tableSymbols = [];

function lex() {
  const exampleCode = fs.readFileSync('./baseExample.ap').toString();

  while (charIndex < exampleCode.length) {
    char = exampleCode.charAt(charIndex);
    const charClass = getCharClass(char);

    state = nextState(state, charClass);

    if (states.final.includes(state)) {
      processing();
    } else if (state === initState) {
      lexeme = '';
    } else {
      lexeme += char;
    }

    charIndex++;
  }

  return {
    tableOfSymb: tableSymbols,
    tableConst: tableConst,
    tableIdents: tableIdents,
  };
}

function processing() {
  if (states.star.includes(state)) {
    charIndex--;
  }

  if (states.newLine.includes(state)) {
    line++;
    state = initState;
  }

  if (states.const.includes(state) || states.ident.includes(state)) {
    const token = getToken(state, lexeme);
    let index = '';

    if (token !== 'keyword') {
      index = indexIdConst(state, lexeme, token);
    }

    tableSymbols.push([line, lexeme, token, index]);

    lexeme = '';
    state = initState;
  }

  if (states.operators.includes(state)) {
    if (lexeme === '' || states.double_operators.includes(state)) {
      lexeme += char;
    }

    const token = getToken(state, lexeme);

    tableSymbols.push([line, lexeme, token]);

    lexeme = '';
    state = initState;
  }

  if (states.error.includes(state)) {
    throw new Error(errorMessages[state]());
  }
}

/**
 * @param {number} state
 * @param {string} lexeme
 * @returns {string}
 */
function getToken(state, lexeme) {
  if (tokens[lexeme]) {
    return tokens[lexeme];
  }

  return tableIdentRealInteger[state];
}

/**
 *
 * @param {number} state
 * @param {string} lexeme
 * @returns {number}
 */
function indexIdConst(state, lexeme, token) {
  // if (states.ident.includes(state)) {
  //   const index = tableIdents.indexOf(lexeme);
  //
  //   if (index !== -1) {
  //     return index;
  //   }
  //
  //   return tableIdents.push(lexeme) - 1;
  // }
  //
  // if (states.const.includes(state)) {
  //   const index = tableConst.indexOf(lexeme);
  //
  //   if (index !== -1) {
  //     return index;
  //   }
  //
  //   return tableConst.push(lexeme) - 1;
  // }
  //
  // throw new Error('Неправильний стан ' + state + ' та лексема ' + lexeme);

  if (states.const.includes(state) || ['true', 'false'].includes(lexeme)) {
    const index = tableConst.findIndex(row => row.lexeme === lexeme);

    if (index !== -1) {
      return index;
    }

    let type = token;
    let value = lexeme;

    if (token === 'integer') {
      value = parseInt(lexeme);
    } else if (token === 'boolval') {
      value = lexeme === 'true';
    } else if (token === 'real') {
      value = parseFloat(lexeme);
    }

    return tableConst.push({ lexeme, type, value }) - 1;
  } else if (states.ident.includes(state)) {
    const index = tableIdents.findIndex(row => row.lexeme === lexeme);

    if (index !== -1) {
      return index;
    }

    return tableIdents.push({ lexeme, type: null, value: null }) - 1;
  }

  throw new Error('Неправильний стан ' + state + ' та лексема ' + lexeme);
}

/**
 * @param {number} state
 * @param {string} charClass
 * @returns {number}
 */
function nextState(state, charClass) {
  for (let i = 0; i < stf.length; i++) {
    if (stf[i][0] === state && stf[i][1] === charClass) {
      return stf[i][2];
    }
  }

  if (charClass !== 'other') {
    return nextState(state, 'other');
  }

  throw new Error(`Невідомий символ ${char} в рядку ${line}`);
}

/**
 * @param {string} char
 * @returns {string}
 */
function getCharClass(char) {
  if (char === '.') {
    return 'dot';
  }

  if ('abcdefghijklmnopqrstuvwxyz'.includes(char.toLowerCase())) {
    return 'Letter';
  }

  if ('0123456789'.includes(char)) {
    return 'Digit';
  }

  if (char === ' ') {
    return 'ws';
  }

  if (char === '\n') {
    return 'nl';
  }

  if ('+-!=*/^<>&|(){}'.includes(char)) {
    return char;
  }

  throw new Error('Невідомий символ "' + char + '" в рядку ' + line);
}

// try {
//   lex();
// } finally {
//   console.log('Таблиця констант', tableConst);
//   console.log('Таблиця ідентифікаторів', tableIdents);
//   console.log('Таблиця символів', tableSymbols);
// }

module.exports = { lex };
