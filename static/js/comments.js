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
  var currentUser = null;
  var allComments = [];
  var isAdmin = false;

  // 管理员邮箱白名单（登录这些邮箱后可以删除任意评论）
  var ADMIN_EMAILS = [];

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
      var isMine = currentUser && c.owner_id && c.owner_id === currentUser.id;
      var canDelete = isAdmin || isMine;

      html += '<div class="wb-comment">'
        + '<div class="wb-avatar">' + esc(initial) + '</div>'
        + '<div class="wb-comment-body">'
        + '<div class="wb-comment-head">'
        + '<span class="wb-name">' + esc(name) + '</span>'
        + (isMine && !isAdmin ? '<span class="wb-badge">我</span>' : '')
        + (isAdmin && !isMine ? '' : '')
        + '<span class="wb-time" title="' + esc(fmtFull(c.created_at)) + '">' + esc(timeAgo(c.created_at)) + '</span>'
        + (canDelete ? '<button class="wb-del" data-id="' + c.id + '" type="button" title="删除">×</button>' : '')
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
    var whoEl = $('#wb-who');
    var adminTag = $('#wb-admin-tag');

    if (currentUser) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (whoEl) { whoEl.style.display = ''; whoEl.innerHTML = '已登录：<b>' + esc(currentUser.email || '') + '</b>'; }
    } else {
      if (loginBtn) loginBtn.style.display = '';
      if (whoEl) whoEl.style.display = 'none';
    }
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
    cloud.database.from('comments').delete().eq('id', id).select()
      .then(function (res) {
        if (res.error) throw res.error;
        var removed = Array.isArray(res.data) ? res.data : [];
        if (!removed.length) {
          setStatus('删除失败：评论不存在，或你没有权限删除', 'err');
          return;
        }
        setStatus('已删除', 'ok');
        return loadComments();
      })
      .catch(function (err) {
        setStatus('删除失败：' + ((err && err.message) || '请稍后重试'), 'err');
      });
  }

  // --------------------------------------------------------------------------
  // 7. 登录（仅管理员用，普通访客无需登录）
  // --------------------------------------------------------------------------
  var pendingOtp = null;

  function sendOtp() {
    var emailEl = $('#wb-login-email');
    var btn = $('#wb-send-otp');
    var email = (emailEl ? emailEl.value : '').trim();
    if (!email || email.indexOf('@') === -1) { setLoginMsg('请输入有效的邮箱', 'err'); return; }

    if (btn) { btn.disabled = true; }
    cloud.auth.sendOtp({ email: email }).then(function (r) {
      if (r.error) { setLoginMsg(r.error.message || '发送失败', 'err'); return; }
      pendingOtp = {
        email: email,
        verificationId: r.data.verificationId,
        isExistingUser: r.data.isExistingUser
      };
      setLoginMsg('验证码已发送到 ' + email + '，请查收（含垃圾箱）', 'ok');
      var codeWrap = $('#wb-code-wrap');
      if (codeWrap) codeWrap.style.display = '';
      var loginEmail = $('#wb-login-email');
      if (loginEmail) loginEmail.readOnly = true;
    }).catch(function (e) {
      setLoginMsg((e && e.message) || '发送失败，请稍后重试', 'err');
    }).then(function () {
      if (btn) { btn.disabled = false; }
    });
  }

  function verifyOtp() {
    var codeEl = $('#wb-login-code');
    var btn = $('#wb-verify');
    var code = (codeEl ? codeEl.value : '').trim();

    if (!pendingOtp) { setLoginMsg('请先获取验证码', 'err'); return; }
    if (!code) { setLoginMsg('请输入验证码', 'err'); return; }

    if (btn) { btn.disabled = true; }
    cloud.auth.verifyOtp({
      email: pendingOtp.email,
      verificationId: pendingOtp.verificationId,
      isExistingUser: pendingOtp.isExistingUser,
      token: code
    }).then(function (r) {
      if (r.error) { setLoginMsg(r.error.message || '验证码错误或已过期', 'err'); return null; }
      pendingOtp = null;
      closeLoginDialog();
      return afterLogin();
    }).catch(function (e) {
      setLoginMsg((e && e.message) || '登录失败', 'err');
    }).then(function () {
      if (btn) { btn.disabled = false; }
    });
  }

  function afterLogin() {
    return cloud.auth.getSession().then(function (r) {
      var session = r && r.data;
      if (!session) { currentUser = null; isAdmin = false; updateAuthUI(); return; }
      currentUser = { id: session.user && session.user.id, email: session.user && session.user.email };
      var em = (currentUser.email || '').toLowerCase();
      isAdmin = ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.indexOf(em) !== -1;
      updateAuthUI();
      renderComments();
      setStatus(isAdmin ? '管理员已登录，可管理所有评论' : '已登录', 'ok');
    });
  }

  function logout() {
    cloud.auth.signOut().then(function () {
      currentUser = null; isAdmin = false;
      updateAuthUI(); renderComments();
      setStatus('已退出登录', 'ok');
    }).catch(function () {
      currentUser = null; isAdmin = false;
      updateAuthUI(); renderComments();
    });
  }

  function setLoginMsg(msg, type) {
    var el = $('#wb-login-msg');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'wb-login-msg' + (type ? ' wb-login-msg--' + type : '');
  }

  function openLoginDialog() {
    var d = $('#wb-login-dialog');
    if (d) d.style.display = 'flex';
    setLoginMsg('');
  }
  function closeLoginDialog() {
    var d = $('#wb-login-dialog');
    if (d) d.style.display = 'none';
    pendingOtp = null;
    var codeWrap = $('#wb-code-wrap');
    if (codeWrap) codeWrap.style.display = 'none';
    var loginEmail = $('#wb-login-email');
    if (loginEmail) { loginEmail.readOnly = false; loginEmail.value = ''; }
    var codeEl = $('#wb-login-code');
    if (codeEl) codeEl.value = '';
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

    // 恢复已有登录态
    cloud.auth.getSession().then(function (r) {
      var session = r && r.data;
      if (session && session.user) {
        currentUser = { id: session.user.id, email: session.user.email };
        var em = (currentUser.email || '').toLowerCase();
        isAdmin = ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.indexOf(em) !== -1;
      }
      updateAuthUI();
      renderComments();
    }).catch(function () { updateAuthUI(); });

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
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    var sendBtn = $('#wb-send-otp');
    if (sendBtn) sendBtn.addEventListener('click', sendOtp);

    var verifyBtn = $('#wb-verify');
    if (verifyBtn) verifyBtn.addEventListener('click', verifyOtp);

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
