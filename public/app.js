(function () {
  'use strict';

  var currentUserId = null;

  // --- ログイン ---
  var loginSelect = document.getElementById('login-user');
  var loginName = document.getElementById('login-name');
  var logoutBtn = document.getElementById('logout-btn');

  fetch('/api/users').then(function (r) { return r.json(); }).then(function (users) {
    usersData = users;
    users.forEach(function (u) {
      var opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = u.name + ' (' + u.role + ')';
      loginSelect.appendChild(opt);
    });
  });

  var usersData = [];

  loginSelect.addEventListener('change', function () {
    var userId = loginSelect.value;
    if (!userId) return;
    currentUserId = userId;
    var user = usersData.find(function (u) { return String(u.id) === String(userId); });
    loginSelect.hidden = true;
    loginName.textContent = user.name;
    loginName.hidden = false;
    logoutBtn.hidden = false;
    onLogin();
  });

  logoutBtn.addEventListener('click', function () {
    currentUserId = null;
    loginSelect.value = '';
    loginSelect.hidden = false;
    loginName.hidden = true;
    logoutBtn.hidden = true;
  });

  function onLogin() {
    // 現在アクティブなタブを再読み込み
    var activeTab = document.querySelector('.tab-btn.active');
    if (activeTab) loadTabContent(activeTab.dataset.tab);
  }

  // --- タブ切り替え ---
  var tabBtns = document.querySelectorAll('.tab-btn');
  var tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = btn.dataset.tab;
      tabBtns.forEach(function (b) { b.classList.remove('active'); });
      tabContents.forEach(function (c) { c.hidden = true; c.classList.remove('active'); });
      btn.classList.add('active');
      var section = document.getElementById(target);
      section.hidden = false;
      section.classList.add('active');
      loadTabContent(target);
    });
  });

  function loadTabContent(target) {
    if (target === 'feed' && feedList.children.length === 0) loadFeed();
    if (target === 'my-videos' && currentUserId) loadMyVideos();
    if (target === 'study-room' && currentUserId) loadStudyRoom();
  }

  // --- フィード ---
  var feedList = document.getElementById('feed-list');
  var loadMoreBtn = document.getElementById('load-more');
  var feedEmpty = document.getElementById('feed-empty');
  var feedOffset = 0;
  var FEED_LIMIT = 10;

  function loadFeed() {
    fetch('/api/feed?limit=' + FEED_LIMIT + '&offset=' + feedOffset)
      .then(function (r) { return r.json(); })
      .then(function (videos) {
        if (videos.length === 0 && feedOffset === 0) {
          feedEmpty.hidden = false;
          loadMoreBtn.hidden = true;
          return;
        }
        feedEmpty.hidden = true;
        videos.forEach(function (v) {
          feedList.appendChild(createVideoCard(v, true));
        });
        feedOffset += videos.length;
        loadMoreBtn.hidden = videos.length < FEED_LIMIT;
      })
      .catch(function (err) {
        console.error('Feed load error:', err);
      });
  }

  loadMoreBtn.addEventListener('click', loadFeed);
  loadFeed();

  // --- 動画カード生成 ---
  function createVideoCard(video, showUser) {
    var card = document.createElement('div');
    card.className = 'video-card';

    var player = document.createElement('video');
    player.src = video.path;
    player.controls = true;
    player.preload = 'metadata';
    player.playsInline = true;
    card.appendChild(player);

    var info = document.createElement('div');
    info.className = 'info';

    var title = document.createElement('div');
    title.className = 'title';
    title.textContent = video.title;
    info.appendChild(title);

    var meta = document.createElement('div');
    meta.className = 'meta';
    var parts = [];
    if (showUser && video.user_name) parts.push(video.user_name);
    parts.push(formatDate(video.created_at));
    meta.textContent = parts.join(' · ');
    info.appendChild(meta);

    var badge = document.createElement('span');
    badge.className = 'visibility-badge ' + video.visibility;
    badge.textContent = { public: '公開', followers: 'フォロワー', private: '非公開' }[video.visibility] || video.visibility;
    info.appendChild(badge);

    card.appendChild(info);
    return card;
  }

  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    var h = String(d.getHours()).padStart(2, '0');
    var min = String(d.getMinutes()).padStart(2, '0');
    return y + '/' + m + '/' + day + ' ' + h + ':' + min;
  }

  function showStatus(el, msg, cls) {
    el.textContent = msg;
    el.className = 'status-msg' + (cls ? ' ' + cls : '');
  }

  // --- アップロード ---
  var uploadForm = document.getElementById('upload-form');
  var uploadStatus = document.getElementById('upload-status');

  uploadForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!currentUserId) {
      showStatus(uploadStatus, 'ログインしてください', 'error');
      return;
    }
    var title = document.getElementById('upload-title').value;
    var visibility = document.getElementById('upload-visibility').value;
    var fileInput = document.getElementById('upload-file');

    if (!title || !fileInput.files[0]) {
      showStatus(uploadStatus, '全項目を入力してください', 'error');
      return;
    }

    var formData = new FormData();
    formData.append('title', title);
    formData.append('visibility', visibility);
    formData.append('video', fileInput.files[0]);

    var submitBtn = uploadForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    showStatus(uploadStatus, 'アップロード中...', '');

    fetch('/api/users/' + currentUserId + '/videos', {
      method: 'POST',
      body: formData
    })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (d) { throw new Error(d.error || 'Upload failed'); });
        return r.json();
      })
      .then(function () {
        showStatus(uploadStatus, 'アップロード完了!', 'success');
        uploadForm.reset();
        feedOffset = 0;
        feedList.innerHTML = '';
        loadFeed();
      })
      .catch(function (err) {
        showStatus(uploadStatus, 'エラー: ' + err.message, 'error');
      })
      .finally(function () {
        submitBtn.disabled = false;
      });
  });

  // --- マイ動画 ---
  var myVideoList = document.getElementById('my-video-list');
  var myEmpty = document.getElementById('my-empty');

  function loadMyVideos() {
    myVideoList.innerHTML = '';
    myEmpty.hidden = true;

    fetch('/api/users/' + currentUserId + '/videos')
      .then(function (r) { return r.json(); })
      .then(function (videos) {
        if (videos.length === 0) {
          myEmpty.hidden = false;
          return;
        }
        videos.forEach(function (v) {
          myVideoList.appendChild(createVideoCard(v, false));
        });
      })
      .catch(function (err) {
        console.error('My videos load error:', err);
      });
  }

  // --- 自習室 ---
  var srContent = document.getElementById('sr-content');
  var srFollowTarget = document.getElementById('sr-follow-target');
  var srFollowBtn = document.getElementById('sr-follow-btn');
  var srFollowStatus = document.getElementById('sr-follow-status');
  var srFollowingList = document.getElementById('sr-following-list');
  var srFollowingEmpty = document.getElementById('sr-following-empty');
  var srFollowersList = document.getElementById('sr-followers-list');
  var srFollowersEmpty = document.getElementById('sr-followers-empty');
  var srLogsList = document.getElementById('sr-logs-list');
  var srLogsEmpty = document.getElementById('sr-logs-empty');
  var srLogsMore = document.getElementById('sr-logs-more');
  var srLogsOffset = 0;
  var SR_LOGS_LIMIT = 20;

  // サブタブ切り替え
  document.querySelectorAll('.sr-tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.sr-tab-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var target = btn.dataset.srTab;
      document.getElementById('sr-following').hidden = target !== 'following';
      document.getElementById('sr-followers').hidden = target !== 'followers';
    });
  });

  function loadStudyRoom() {
    loadFollowTargets();
    loadFollowing();
    loadFollowers();
    srLogsOffset = 0;
    srLogsList.innerHTML = '';
    loadFollowingLogs();
  }

  function loadFollowTargets() {
    srFollowTarget.innerHTML = '<option value="">フォローするユーザー</option>';
    usersData.forEach(function (u) {
      if (String(u.id) === String(currentUserId)) return;
      var opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = u.name + ' (' + u.role + ')';
      srFollowTarget.appendChild(opt);
    });
  }

  srFollowBtn.addEventListener('click', function () {
    var targetId = srFollowTarget.value;
    if (!currentUserId || !targetId) return;

    fetch('/api/users/' + currentUserId + '/follow/' + targetId, { method: 'POST' })
      .then(function (r) {
        if (r.status === 409) { showStatus(srFollowStatus, '既にフォロー済みです', 'error'); return; }
        if (!r.ok) return r.json().then(function (d) { throw new Error(d.error); });
        return r.json();
      })
      .then(function (data) {
        if (!data) return;
        showStatus(srFollowStatus, 'フォローしました', 'success');
        loadFollowing();
        srLogsOffset = 0;
        srLogsList.innerHTML = '';
        loadFollowingLogs();
      })
      .catch(function (err) {
        showStatus(srFollowStatus, 'エラー: ' + err.message, 'error');
      });
  });

  function loadFollowing() {
    srFollowingList.innerHTML = '';
    srFollowingEmpty.hidden = true;
    fetch('/api/users/' + currentUserId + '/following')
      .then(function (r) { return r.json(); })
      .then(function (users) {
        if (users.length === 0) { srFollowingEmpty.hidden = false; return; }
        users.forEach(function (u) {
          srFollowingList.appendChild(createUserItem(u));
        });
      });
  }

  function loadFollowers() {
    srFollowersList.innerHTML = '';
    srFollowersEmpty.hidden = true;
    fetch('/api/users/' + currentUserId + '/followers')
      .then(function (r) { return r.json(); })
      .then(function (users) {
        if (users.length === 0) { srFollowersEmpty.hidden = false; return; }
        users.forEach(function (u) {
          var item = document.createElement('div');
          item.className = 'user-item';
          item.innerHTML = '<span><span class="user-name"></span><span class="user-role"></span></span>';
          item.querySelector('.user-name').textContent = u.name;
          item.querySelector('.user-role').textContent = u.role;
          srFollowersList.appendChild(item);
        });
      });
  }

  function createUserItem(user) {
    var item = document.createElement('div');
    item.className = 'user-item';

    var nameSpan = document.createElement('span');
    var name = document.createElement('span');
    name.className = 'user-name';
    name.textContent = user.name;
    var role = document.createElement('span');
    role.className = 'user-role';
    role.textContent = user.role;
    nameSpan.appendChild(name);
    nameSpan.appendChild(role);
    item.appendChild(nameSpan);

    var unfollowBtn = document.createElement('button');
    unfollowBtn.className = 'btn-unfollow';
    unfollowBtn.textContent = '解除';
    unfollowBtn.addEventListener('click', function () {
      fetch('/api/users/' + currentUserId + '/follow/' + user.id, { method: 'DELETE' })
        .then(function (r) {
          if (r.ok) {
            loadFollowing();
            srLogsOffset = 0;
            srLogsList.innerHTML = '';
            loadFollowingLogs();
          }
        });
    });
    item.appendChild(unfollowBtn);

    return item;
  }

  function loadFollowingLogs() {
    srLogsEmpty.hidden = true;
    srLogsMore.hidden = true;
    fetch('/api/users/' + currentUserId + '/following/study-logs?limit=' + SR_LOGS_LIMIT + '&offset=' + srLogsOffset)
      .then(function (r) { return r.json(); })
      .then(function (logs) {
        if (logs.length === 0 && srLogsOffset === 0) { srLogsEmpty.hidden = false; return; }
        logs.forEach(function (log) {
          srLogsList.appendChild(createLogItem(log));
        });
        srLogsOffset += logs.length;
        srLogsMore.hidden = logs.length < SR_LOGS_LIMIT;
      });
  }

  srLogsMore.addEventListener('click', function () {
    if (currentUserId) loadFollowingLogs();
  });

  function createLogItem(log) {
    var item = document.createElement('div');
    item.className = 'log-item';

    var userDiv = document.createElement('div');
    userDiv.className = 'log-user';
    userDiv.textContent = log.user_name;
    item.appendChild(userDiv);

    var subjectDiv = document.createElement('div');
    subjectDiv.className = 'log-subject';
    subjectDiv.textContent = log.subject;
    item.appendChild(subjectDiv);

    var detailParts = [log.duration_min + '分'];
    if (log.page_start != null && log.page_end != null) {
      detailParts.push('p.' + log.page_start + '-' + log.page_end);
    }
    detailParts.push(formatDate(log.studied_at));

    var detailDiv = document.createElement('div');
    detailDiv.className = 'log-detail';
    detailDiv.textContent = detailParts.join(' · ');
    item.appendChild(detailDiv);

    return item;
  }
})();
