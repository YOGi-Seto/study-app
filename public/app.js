(function () {
  'use strict';

  // --- タブ切り替え ---
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const target = btn.dataset.tab;
      tabBtns.forEach(function (b) { b.classList.remove('active'); });
      tabContents.forEach(function (c) { c.hidden = true; c.classList.remove('active'); });
      btn.classList.add('active');
      var section = document.getElementById(target);
      section.hidden = false;
      section.classList.add('active');

      if (target === 'feed' && feedList.children.length === 0) loadFeed();
      if (target === 'upload') loadUsersFor('upload-user');
      if (target === 'my-videos') loadUsersFor('my-user');
    });
  });

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

  // 初回読み込み
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

  // --- ユーザー一覧取得 ---
  var usersCache = null;

  function loadUsersFor(selectId) {
    var select = document.getElementById(selectId);
    if (select.options.length > 1) return; // already loaded

    var promise = usersCache || fetch('/api/users').then(function (r) { return r.json(); });
    promise.then(function (users) {
      usersCache = Promise.resolve(users);
      // 既に入っている場合はスキップ
      if (select.options.length > 1) return;
      users.forEach(function (u) {
        var opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = u.name + ' (' + u.role + ')';
        select.appendChild(opt);
      });
    });
  }

  // --- アップロード ---
  var uploadForm = document.getElementById('upload-form');
  var uploadStatus = document.getElementById('upload-status');

  uploadForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var userId = document.getElementById('upload-user').value;
    var title = document.getElementById('upload-title').value;
    var visibility = document.getElementById('upload-visibility').value;
    var fileInput = document.getElementById('upload-file');

    if (!userId || !title || !fileInput.files[0]) {
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

    fetch('/api/users/' + userId + '/videos', {
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
        // フィードをリセットして再読み込み
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

  function showStatus(el, msg, cls) {
    el.textContent = msg;
    el.className = 'status-msg' + (cls ? ' ' + cls : '');
  }

  // --- マイ動画 ---
  var myLoadBtn = document.getElementById('my-load');
  var myVideoList = document.getElementById('my-video-list');
  var myEmpty = document.getElementById('my-empty');

  myLoadBtn.addEventListener('click', function () {
    var userId = document.getElementById('my-user').value;
    if (!userId) return;

    myVideoList.innerHTML = '';
    myEmpty.hidden = true;

    fetch('/api/users/' + userId + '/videos')
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
  });
})();
