// 检查新增词条的误伤风险
const words = ['yujia', 'yjunjun', 'yjiajun', 'yujun', 'yjjun', 'jiajun', 'jiangjun', 'yu-jia', 'jia-jun',
               '鱼加菌', '鱼佳骏', '余嘉骏', '余嘉俊', '余佳俊', '俞佳骏', '于佳骏', '余加军', '余建军', '余家军'];

function normalize(t) {
  return String(t || '').toLowerCase()
    .replace(/[\u200b-\u200f\u2060\ufeff]/g, '')
    .replace(/[\s\.\-\_\*\@\#\$\%\^\&\(\)\[\]\{\}\+\=\/\\\|~`'",;:!?<>]/g, '');
}

// 可能被误伤的正常表达
const legit = [
  '江军是我的朋友',      // jiangjun 谐音
  '加军今天来了',        // jiajun
  '李佳俊同学',          // jiajun? 不，是 jiajun -> jiajun
  '陈家俊',
  '王家军',
  '张建军',
  '余嘉是个人名',
  '关于嘉俊的文章',      // jiajun
  '建军节快乐',          // jianjun
  '这个将军很厉害',      // jiangjun
];

console.log('=== 检测误伤 ===');
let risk = 0;
for (const t of legit) {
  const norm = normalize(t);
  const hits = words.filter(w => norm.includes(normalize(w)));
  if (hits.length) {
    risk++;
    console.log(`⚠️  ${JSON.stringify(t)} -> 命中: ${hits.join(',')}`);
  } else {
    console.log(`✅ ${JSON.stringify(t)} -> 放行`);
  }
}
console.log('');
console.log(risk ? `${risk} 处潜在误伤` : '无误伤');
