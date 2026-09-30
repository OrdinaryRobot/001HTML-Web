/* ============================================================================
 * 博客评论系统 —— 基于 WorkBuddy 云服务
 * ============================================================================
 * 特性：
 *   - 免登录评论（填昵称即可）
 *   - 敏感词过滤（从云端 banned_words 表读取，实时拦截）
 *   - 管理员登录后可删除任意评论
 *   - 数据存云端数据库，跨设备可见
 * ==========================================================================*/
(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. 配置（endpoint / publishableKey 来自云服务 publicConfig，非密钥）
  // --------------------------------------------------------------------------
  var PUBLIC_CONFIG = {
    endpoint: 'https://blog-comments.app.workbuddy.host',
    publishableKey: 'wbpk_667XBfgMaRu9CYNbU8iwty_F2uB2nkB0P6J7ShXyHK9j6MrCC2E6GkF'
  };

  var SDK_URL = 'https://cdn.jsdelivr.net/npm/@tencent-ai/workbuddy-cloud-sdk@dev/lib/index.global.js';

  // 本地兜底敏感词（云端拉取失败时使用，保证永远有基本防护）
  var FALLBACK_WORDS = [
    'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dick', 'pussy',
    'nigger', 'whore', 'slut', 'porn', 'nazi', 'rape', 'spam', 'scam',
    '傻逼', '妈的', '草泥马', '去死', '贱人', '脑残', '智障', '神经病',
    '赌博', '博彩', '代开发票', '办证'
  ];

  // --------------------------------------------------------------------------
  // 2. 状态
  // --------------------------------------------------------------------------
  var cloud = null;
  var bannedWords = [];
  var allComments = [];
  var isAdmin = false;

  // --------------------------------------------------------------------------
  // 3. DOM 工具
  // --------------------------------------------------------------------------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function timeAgo(iso) {
    try {
      var t = new Date(iso).getTime();
      var diff = Math.floor((Date.now() - t) / 1000);
      if (diff < 60) return '刚刚';
      if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
      if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
      if (diff < 2592000) return Math.floor(diff / 86400) + ' 天前';
      var d = new Date(iso);
      return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
    } catch (e) { return ''; }
  }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function fmtFull(iso) {
    try {
      var d = new Date(iso);
      return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
        + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    } catch (e) { return ''; }
  }

  // --------------------------------------------------------------------------
  // 4. 敏感词检测
  // --------------------------------------------------------------------------
  // 归一化：转小写、去掉零宽字符、合并常见分隔符绕过（如 f.u.c.k / f u c k）
  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[\u200b-\u200f\u2060\ufeff]/g, '')  // 零宽字符
      .replace(/[\s\.\-\_\*\@\#\$\%\^\&\(\)\[\]\{\}\+\=\/\\\|~`'",;:!?<>]/g, '');
  }

  function findBanned(text) {
    var hit = [];
    var norm = normalize(text);
    if (!norm) return hit;
    for (var i = 0; i < bannedWords.length; i++) {
      var w = bannedWords[i];
      var nw = normalize(w);
      if (nw && norm.indexOf(nw) !== -1) hit.push(w);
    }
    return hit;
  }

  // 把命中的敏感词用 ●●● 替换
  function maskText(text) {
    var out = String(text || '');
    for (var i = 0; i < bannedWords.length; i++) {
      var w = bannedWords[i];
      if (!w) continue;
      var re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      out = out.replace(re, function (m) { return new Array(m.length + 1).join('●'); });
    }
    return out;
  }

  // --------------------------------------------------------------------------
  // 5. 渲染
  // --------------------------------------------------------------------------
  function renderComments() {
    var box = $('#wb-comment-list');
    var countEl = $('#wb-comment-count');
    if (!box) return;

    if (countEl) countEl.textContent = allComments.length;

    if (!allComments.length) {
      box.innerHTML = '<p class="wb-empty">还没有评论，来说点什么吧 ~</p>';
      return;
    }

    var html = '';
    for (var i = 0; i < allComments.length; i++) {
      var c = allComments[i];
      var name = c.owner_name || '匿名访客';
      var initial = name.charAt(0).toUpperCase();

      html += '<div class="wb-comment">'
        + '<div class="wb-avatar">' + esc(initial) + '</div>'
        + '<div class="wb-comment-body">'
        + '<div class="wb-comment-head">'
        + '<span class="wb-name">' + esc(name) + '</span>'
        + '<span class="wb-time" title="' + esc(fmtFull(c.created_at)) + '">' + esc(timeAgo(c.created_at)) + '</span>'
        + (isAdmin ? '<button class="wb-del" data-id="' + c.id + '" type="button" title="删除">×</button>' : '')
        + '</div>'
        + '<div class="wb-text">' + esc(c.content).replace(/\n/g, '<br>') + '</div>'
        + '</div>'
        + '</div>';
    }
    box.innerHTML = html;

    $$('.wb-del', box).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = Number(btn.getAttribute('data-id'));
        deleteComment(id);
      });
    });
  }

  function setStatus(msg, type) {
    var el = $('#wb-status');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'wb-status' + (type ? ' wb-status--' + type : '');
    if (!msg) return;
    if (type === 'ok') {
      setTimeout(function () {
        if (el.textContent === msg) { el.textContent = ''; el.className = 'wb-status'; }
      }, 4000);
    }
  }

  function updateAuthUI() {
    var loginBtn = $('#wb-login-btn');
    var logoutBtn = $('#wb-logout-btn');
    var adminTag = $('#wb-admin-tag');

    if (loginBtn) loginBtn.style.display = isAdmin ? 'none' : '';
    if (logoutBtn) logoutBtn.style.display = isAdmin ? '' : 'none';
    if (adminTag) adminTag.style.display = isAdmin ? '' : 'none';
  }

  // --------------------------------------------------------------------------
  // 6. 数据操作
  // --------------------------------------------------------------------------
  function pagePath() {
    // 去掉 baseURL 前缀和末尾斜杠，作为页面唯一标识
    var p = window.location.pathname.replace(/\/index\.html$/, '/');
    return p;
  }

  function loadBannedWords() {
    return cloud.database.from('banned_words').select('word')
      .then(function (res) {
        if (res.error) throw res.error;
        var rows = res.data || [];
        bannedWords = rows.map(function (r) { return r.word; }).filter(Boolean);
        if (!bannedWords.length) bannedWords = FALLBACK_WORDS.slice();
        return bannedWords;
      })
      .catch(function () {
        bannedWords = FALLBACK_WORDS.slice();
        return bannedWords;
      });
  }

  function loadComments() {
    return cloud.database.from('comments')
      .select('id, owner_id, owner_name, content, created_at, page_path')
      .eq('page_path', pagePath())
      .order('created_at', { ascending: true })
      .limit(200)
      .then(function (res) {
        if (res.error) throw res.error;
        allComments = res.data || [];
        renderComments();
      });
  }

  function submitComment() {
    var nameEl = $('#wb-name-input');
    var textEl = $('#wb-text-input');
    var btn = $('#wb-submit');

    var name = (nameEl ? nameEl.value : '').trim();
    var text = (textEl ? textEl.value : '').trim();

    if (!text) { setStatus('请先写点内容再提交 ~', 'err'); return; }
    if (text.length > 2000) { setStatus('评论太长了（最多 2000 字）', 'err'); return; }
    if (!name) {
      name = '匿名访客';
    }
    if (name.length > 30) { setStatus('昵称太长了（最多 30 字）', 'err'); return; }

    // ---- 敏感词拦截 ----
    var hitName = findBanned(name);
    if (hitName.length) {
      setStatus('昵称含有敏感词「' + hitName[0] + '」，请修改后重试', 'err');
      return;
    }
    var hitText = findBanned(text);
    if (hitText.length) {
      setStatus('评论含有敏感词「' + hitText[0] + '」，请修改后重试', 'err');
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = '发布中…'; }

    var row = {
      owner_name: name,
      content: text,
      page_path: pagePath()
    };

    cloud.database.from('comments').insert(row).select()
      .then(function (res) {
        if (res.error) throw res.error;
        // 插入成功后清空输入并刷新列表
        if (textEl) textEl.value = '';
        setStatus('评论发布成功！', 'ok');
        return loadComments();
      })
      .catch(function (err) {
        var msg = (err && (err.message || err.details || err.hint)) || '';
        if (err && err.code === '42501') {
          msg = '发布被拒绝，可能是内容不符合规则';
        }
        setStatus('发布失败：' + (msg || '请稍后重试'), 'err');
      })
      .then(function () {
        if (btn) { btn.disabled = false; btn.textContent = '发表评论'; }
      });
  }

  function deleteComment(id) {
    if (!window.confirm('确定要删除这条评论吗？该操作不可恢复。')) return;

    // 已存过口令则直接用，否则弹窗索要
    var secret = getSavedSecret();
    if (!secret) {
      secret = window.prompt('请输入管理口令（仅站长知道）：');
      if (!secret) return;
    }

    deleteViaRpc(secret, id, true);
  }

  // 通过服务端 RPC 删除（口令在服务端校验，SHA256 比对）
  function deleteViaRpc(secret, id, allowRetry) {
    setStatus('正在删除…', '');
    cloud.database.rpc('admin_delete_comment', { p_secret: secret, p_id: id })
      .then(function (res) {
        if (res.error) throw res.error;
        // 函数返回 boolean：true = 删除成功
        if (res.data === true) {
          saveSecret(secret);
          setStatus('已删除', 'ok');
          return loadComments();
        }
        // false = 口令错误
        clearSecret();
        setStatus('口令不正确，删除失败', 'err');
        if (allowRetry) {
          var retry = window.prompt('口令不正确，请重新输入（留空放弃）：');
          if (retry) return deleteViaRpc(retry, id, false);
        }
      })
      .catch(function (err) {
        var msg = (err && (err.message || err.details)) || '';
        if (err && err.code === '42883') {
          msg = '服务端删除函数未就绪，请稍后重试';
        }
        setStatus('删除失败：' + (msg || '请稍后重试'), 'err');
      });
  }

  // 口令存在浏览器本地（只是免去重复输入，真正的校验在服务端）
  var SECRET_KEY = 'wb_admin_secret';
  function getSavedSecret() {
    try { return window.localStorage.getItem(SECRET_KEY) || ''; } catch (e) { return ''; }
  }
  function saveSecret(s) {
    try { window.localStorage.setItem(SECRET_KEY, s); } catch (e) { /* 隐私模式忽略 */ }
  }
  function clearSecret() {
    try { window.localStorage.removeItem(SECRET_KEY); } catch (e) { /* ignore */ }
  }

  // --------------------------------------------------------------------------
  // 7. 站长模式（口令解锁，用于显示删除按钮）
  // --------------------------------------------------------------------------
  // 访客完全无需登录。站长点「站长入口」输入口令，验证通过后
  // 浏览器记住该口令，之后评论旁就会显示删除按钮。
  // 真正的鉴权在服务端 admin_delete_comment 函数里（SHA256 比对），
  // 本地存的只是「免重复输入」，泄露也无法绕过服务端校验。

  function setLoginMsg(msg, type) {
    var el = $('#wb-login-msg');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'wb-login-msg' + (type ? ' wb-login-msg--' + type : '');
  }

  // 校验口令：服务端 admin_check_secret 返回 boolean
  function checkSecret(secret) {
    return cloud.database.rpc('admin_check_secret', { p_secret: secret })
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data === true;
      });
  }

  function unlockAdmin() {
    var inputEl = $('#wb-secret-input');
    var btn = $('#wb-verify');
    var secret = (inputEl ? inputEl.value : '').trim();
    if (!secret) { setLoginMsg('请输入口令', 'err'); return; }

    if (btn) { btn.disabled = true; btn.textContent = '验证中…'; }
    checkSecret(secret)
      .then(function (ok) {
        if (!ok) { setLoginMsg('口令不正确', 'err'); return; }
        saveSecret(secret);
        isAdmin = true;
        closeLoginDialog();
        updateAuthUI();
        renderComments();
        setStatus('站长模式已开启，评论旁会显示删除按钮', 'ok');
      })
      .catch(function (e) {
        var msg = (e && (e.message || e.details)) || '验证失败，请稍后重试';
        if (e && e.code === '42883') {
          msg = '服务端校验函数未就绪，请稍后重试';
        }
        setLoginMsg(msg, 'err');
      })
      .then(function () {
        if (btn) { btn.disabled = false; btn.textContent = '解锁'; }
      });
  }

  function lockAdmin() {
    clearSecret();
    isAdmin = false;
    updateAuthUI();
    renderComments();
    setStatus('已退出站长模式', 'ok');
  }

  function openLoginDialog() {
    var d = $('#wb-login-dialog');
    if (d) d.style.display = 'flex';
    setLoginMsg('');
    var inputEl = $('#wb-secret-input');
    if (inputEl) { inputEl.value = ''; inputEl.focus(); }
  }
  function closeLoginDialog() {
    var d = $('#wb-login-dialog');
    if (d) d.style.display = 'none';
    var inputEl = $('#wb-secret-input');
    if (inputEl) inputEl.value = '';
  }

  // --------------------------------------------------------------------------
  // 8. 初始化
  // --------------------------------------------------------------------------
  function injectStyles() {
    if ($('#wb-css')) return;
    var link = document.createElement('link');
    link.id = 'wb-css';
    link.rel = 'stylesheet';
    link.href = '/001HTML-Web/css/comments.css';
    document.head.appendChild(link);
  }

  function loadSdk(cb) {
    if (window.WorkBuddyCloud) { cb(); return; }
    var s = document.createElement('script');
    s.src = SDK_URL;
    s.async = true;
    s.onload = cb;
    s.onerror = function () {
      setStatus('评论组件加载失败，请检查网络后刷新页面', 'err');
    };
    document.head.appendChild(s);
  }

  function boot() {
    if (!window.WorkBuddyCloud || !window.WorkBuddyCloud.createWorkBuddyCloud) {
      setStatus('评论组件未就绪，请刷新重试', 'err');
      return;
    }

    cloud = window.WorkBuddyCloud.createWorkBuddyCloud({
      endpoint: PUBLIC_CONFIG.endpoint,
      publishableKey: PUBLIC_CONFIG.publishableKey
    });

    // 拉取敏感词 + 评论
    Promise.all([loadBannedWords(), loadComments()])
      .catch(function (e) {
        setStatus('加载失败：' + ((e && e.message) || '请稍后刷新重试'), 'err');
      });

    // 恢复站长模式：本地存有口令就先乐观开启，
    // 首次删除时会经过服务端校验，口令失效则自动关闭
    if (getSavedSecret()) {
      isAdmin = true;
    }
    updateAuthUI();
    renderComments();

    // 绑定事件
    var submitBtn = $('#wb-submit');
    if (submitBtn) submitBtn.addEventListener('click', submitComment);

    var textEl = $('#wb-text-input');
    if (textEl) {
      textEl.addEventListener('keydown', function (e) {
        // Ctrl/Cmd + Enter 快捷提交
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          submitComment();
        }
      });
      textEl.addEventListener('input', function () {
        var len = $('#wb-len');
        if (len) len.textContent = textEl.value.length + ' / 2000';
      });
    }

    var loginBtn = $('#wb-login-btn');
    if (loginBtn) loginBtn.addEventListener('click', openLoginDialog);

    var logoutBtn = $('#wb-logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', lockAdmin);

    var verifyBtn = $('#wb-verify');
    if (verifyBtn) verifyBtn.addEventListener('click', unlockAdmin);

    var secretEl = $('#wb-secret-input');
    if (secretEl) {
      secretEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); unlockAdmin(); }
      });
    }

    var closeBtn = $('#wb-login-close');
    if (closeBtn) closeBtn.addEventListener('click', closeLoginDialog);

    var dialog = $('#wb-login-dialog');
    if (dialog) {
      dialog.addEventListener('click', function (e) {
        if (e.target === dialog) closeLoginDialog();
      });
    }

    setStatus('已就绪 · 敏感词库 ' + bannedWords.length + ' 条', 'ok');
  }

  function start() {
    injectStyles();
    loadSdk(boot);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
