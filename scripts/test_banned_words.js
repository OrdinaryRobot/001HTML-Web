// 敏感词匹配逻辑验证（纯函数复刻自 comments.js，用于离线测试）
function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\u200b-\u200f\u2060\ufeff]/g, '')
    .replace(/[\s\.\-\_\*\@\#\$\%\^\&\(\)\[\]\{\}\+\=\/\\\|~`'",;:!?<>]/g, '');
}

function buildBannedWords() {
  return ['余佳骏', 'yujiajun', 'yujiangjun', 'yu jia jun', 'yu jiang jun',
          '余 佳 骏', 'yu-jia-jun', 'yu-jiang-jun', '傻逼', '妈的', '赌博'];
}

function findBanned(text, bannedWords) {
  const hit = [];
  const norm = normalize(text);
  if (!norm) return hit;
  for (const w of bannedWords) {
    const nw = normalize(w);
    if (nw && norm.indexOf(nw) !== -1) hit.push(w);
  }
  return hit;
}

const words = buildBannedWords();

// 应该被拦截的（阳性样本）
const shouldBlock = [
  '余佳骏',
  '余佳骏是个坏人',
  '今天余佳骏来了',
  'yujiajun',
  'YUJIAJUN',
  'yujiangjun',
  'yu jia jun',
  'yu-jiang-jun',
  'y u j i a j u n',
  'YuJiaJun 你好',
  'yujiajun123',
  '你觉得余佳骏怎么样',  '余\u200b佳\u200b骏',  // 零宽字符绕过
  '傻逼',
  '你个傻逼',
  '妈的',
];

// 不应该误伤的（阴性样本）
const shouldPass = [
  '你好，欢迎来到我的博客',
  '这是一篇关于 Hugo 的文章',
  '今天天气不错',
  '我喜欢电子音乐',
  'test comment 123',
  'Great post!',
  'Thanks for sharing',
  '学习使我快乐',
];

console.log('=== 敏感词库 ===');
console.log(words.join(' / '));
console.log('');

let fail = 0;

console.log('=== 阳性样本（应全部拦截）===');
for (const t of shouldBlock) {
  const hit = findBanned(t, words);
  const ok = hit.length > 0;
  if (!ok) fail++;
  console.log(`${ok ? '✅' : '❌'} ${JSON.stringify(t)}  ->  ${hit.length ? hit.join(',') : '(未命中)'}`);
}

console.log('');
console.log('=== 阴性样本（应全部放行）===');
for (const t of shouldPass) {
  const hit = findBanned(t, words);
  const ok = hit.length === 0;
  if (!ok) fail++;
  console.log(`${ok ? '✅' : '❌'} ${JSON.stringify(t)}  ->  ${hit.length ? '误伤:' + hit.join(',') : '(放行)'}`);
}

console.log('');
console.log(fail === 0 ? '🎉 全部通过' : `⚠️  ${fail} 项未通过`);
process.exit(fail === 0 ? 0 : 1);
