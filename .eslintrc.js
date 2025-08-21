module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  rules: {
    // Aucune règle bloquante, tout est autorisé
    'no-unused-vars': 'warn',        // juste un warning si variable non utilisée
    'no-console': 'off',             // autorise les console.log
    'no-empty': 'off',               // autorise les blocs vides
    'no-undef': 'error',             // empêche l’utilisation de variables non définies
  },
};
