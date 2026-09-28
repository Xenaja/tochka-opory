// Запуск: node tests/form.test.mjs
import { normalizeTg } from '../js/form.js';

const cases = [
  ['maria_k', '@maria_k'],
  ['@maria_k', '@maria_k'],
  ['  @Maria_K  ', '@Maria_K'],
  ['https://t.me/maria_k', '@maria_k'],
  ['t.me/maria_k/', '@maria_k'],
  ['+7 (900) 123-45-67', '+79001234567'],
  ['89001234567', '89001234567'],
  ['123', null],
  ['@ab', null],
  ['@1abcde', null],
  ['мария', null],
  ['', null],
];
let fail = 0;
for (const [input, want] of cases) {
  const got = normalizeTg(input);
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${JSON.stringify(input)} -> ${got}${ok ? '' : ` (ждали ${want})`}`);
}
console.log(`\n${cases.length - fail} ок, ${fail} ошибок`);
process.exit(fail ? 1 : 0);
