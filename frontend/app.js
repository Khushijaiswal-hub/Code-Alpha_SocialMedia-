const API = 'http://localhost:5000/api';
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let currentPostId = null;

// ===== INIT =====
window.onload = () => {
  if (token && currentUser) {
    showApp();
    loadFeed();
    updateSidebarUser();
  } else {
    document.getElementById('auth-section').classList.remove('hidden');
  }
};

// ===== AUTH =====
function showRegister() {
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('register-form').classList.remove('hidden');
}

function showLogin() {
  document.getElementById('register-form').classList.add('hidden');
  document.getElementById('login-form').classList.remove('hidden');
}

async function register() {
  const name = document.getElementById('reg-name').value.trim();
  const username = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const errEl = document.getElementById('register-error');

  if (!name || !username || !email || !password) {
    errEl.textContent = 'All fields are required!';
    return;
  }

  try {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username, email, password })
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error; return; }

    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(currentUser));
    showApp();
    loadFeed();
    updateSidebarUser();
  } catch (err) {
    errEl.textContent = 'Server error. Make sure backend is running!';
  }
}

async function login() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');

  if (!email || !password) { errEl.textContent = 'Email and password required!'; return; }

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error; return; }

    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(currentUser));
    showApp();
    loadFeed();
    updateSidebarUser();
  } catch (err) {
    errEl.textContent = 'Server error. Make sure backend is running!';
  }
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  document.getElementById('app-section').classList.add('hidden');
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').textContent = '';
  showLogin();
}

// ===== APP HELPERS =====
function showApp() {
  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('app-section').classList.remove('hidden');
}

function updateSidebarUser() {
  if (!currentUser) return;
  document.getElementById('sidebar-name').textContent = currentUser.name;
  document.getElementById('sidebar-username').textContent = '@' + currentUser.username;
  document.getElementById('sidebar-avatar').textContent = currentUser.name[0].toUpperCase();
  document.getElementById('post-avatar').textContent = currentUser.name[0].toUpperCase();
}

function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.remove('hidden');
  event.currentTarget.classList.add('active');

  if (page === 'feed') loadFeed();
  if (page === 'explore') loadUsers();
  if (page === 'profile') loadMyProfile();
}

function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ===== FEED =====
async function loadFeed() {
  const container = document.getElementById('posts-container');
  container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading posts...</div>';

  try {
    const res = await fetch(`${API}/posts`, { headers: authHeaders() });
    const posts = await res.json();

    if (posts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-newspaper"></i>
          <p>No posts yet. Be the first to post!</p>
        </div>`;
      return;
    }

    container.innerHTML = posts.map(post => renderPost(post)).join('');
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Could not load posts. Check backend!</p></div>';
  }
}

function renderPost(post) {
  const isOwner = post.user_id === currentUser.id;
  const liked = post.liked_by_me > 0;
  return `
    <div class="post-card" id="post-${post.id}">
      <div class="post-header">
        <div class="user-avatar sm">${post.name[0].toUpperCase()}</div>
        <div class="post-user-info">
          <div class="name" onclick="viewProfile(${post.user_id})">${post.name} <span style="color:var(--accent2);font-size:.8rem">@${post.username}</span></div>
          <div class="meta">${timeAgo(post.created_at)}</div>
        </div>
        ${isOwner ? `<button class="action-btn delete-btn" onclick="deletePost(${post.id})"><i class="fas fa-trash"></i></button>` : ''}
      </div>
      <div class="post-content">${escapeHtml(post.content)}</div>
      <div class="post-actions">
        <button class="action-btn ${liked ? 'liked' : ''}" onclick="toggleLike(${post.id}, this)">
          <i class="${liked ? 'fas' : 'far'} fa-heart"></i> <span>${post.likes_count}</span>
        </button>
        <button class="action-btn" onclick="openComments(${post.id})">
          <i class="far fa-comment"></i> <span>${post.comments_count}</span>
        </button>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

async function createPost() {
  const content = document.getElementById('post-content').value.trim();
  if (!content) return;

  try {
    const res = await fetch(`${API}/posts`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ content })
    });
    if (res.ok) {
      document.getElementById('post-content').value = '';
      loadFeed();
    }
  } catch (err) {
    alert('Error creating post!');
  }
}

async function deletePost(postId) {
  if (!confirm('Delete this post?')) return;
  try {
    await fetch(`${API}/posts/${postId}`, { method: 'DELETE', headers: authHeaders() });
    document.getElementById(`post-${postId}`)?.remove();
  } catch (err) {
    alert('Error deleting post!');
  }
}

async function toggleLike(postId, btn) {
  try {
    const res = await fetch(`${API}/posts/${postId}/like`, { method: 'POST', headers: authHeaders() });
    const data = await res.json();
    const countEl = btn.querySelector('span');
    const iconEl = btn.querySelector('i');
    const count = parseInt(countEl.textContent);
    if (data.liked) {
      btn.classList.add('liked');
      iconEl.className = 'fas fa-heart';
      countEl.textContent = count + 1;
    } else {
      btn.classList.remove('liked');
      iconEl.className = 'far fa-heart';
      countEl.textContent = Math.max(0, count - 1);
    }
  } catch (err) {
    console.error('Like error:', err);
  }
}

// ===== COMMENTS =====
function openComments(postId) {
  currentPostId = postId;
  document.getElementById('comments-modal').classList.remove('hidden');
  loadComments(postId);
}

function closeComments() {
  document.getElementById('comments-modal').classList.add('hidden');
  document.getElementById('comment-text').value = '';
  currentPostId = null;
}

async function loadComments(postId) {
  const list = document.getElementById('comments-list');
  list.innerHTML = '<div class="loading">Loading comments...</div>';
  try {
    const res = await fetch(`${API}/comments/${postId}`, { headers: authHeaders() });
    const comments = await res.json();
    if (comments.length === 0) {
      list.innerHTML = '<div class="empty-state" style="padding:30px"><i class="fas fa-comment-slash"></i><p>No comments yet</p></div>';
      return;
    }
    list.innerHTML = comments.map(c => `
      <div class="comment-item">
        <div class="user-avatar sm">${c.name[0].toUpperCase()}</div>
        <div class="comment-body">
          <div class="comment-author">${c.name} <span style="color:var(--text-muted);font-weight:400">@${c.username}</span></div>
          <div class="comment-text">${escapeHtml(c.content)}</div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = '<div class="empty-state"><p>Error loading comments</p></div>';
  }
}

async function addComment() {
  const content = document.getElementById('comment-text').value.trim();
  if (!content || !currentPostId) return;

  try {
    const res = await fetch(`${API}/comments/${currentPostId}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ content })
    });
    if (res.ok) {
      document.getElementById('comment-text').value = '';
      loadComments(currentPostId);
    }
  } catch (err) {
    alert('Error adding comment!');
  }
}

// Enter key for comment
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('comment-text')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addComment();
  });
});

// ===== EXPLORE =====
async function loadUsers() {
  const container = document.getElementById('users-container');
  container.innerHTML = '<div class="loading">Loading users...</div>';
  try {
    const res = await fetch(`${API}/users`, { headers: authHeaders() });
    const users = await res.json();
    if (users.length === 0) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>No other users yet</p></div>';
      return;
    }
    container.innerHTML = users.map(u => renderUserCard(u)).join('');
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><p>Error loading users</p></div>';
  }
}

function renderUserCard(user) {
  return `
    <div class="user-card">
      <div class="user-avatar">${user.name[0].toUpperCase()}</div>
      <div class="name" onclick="viewProfile(${user.id})">${user.name}</div>
      <div class="username">@${user.username}</div>
      <div class="bio">${user.bio || 'No bio yet'}</div>
      <button class="follow-btn" id="follow-btn-${user.id}" onclick="toggleFollow(${user.id})">
        <i class="fas fa-user-plus"></i> Follow
      </button>
    </div>
  `;
}

async function searchUsers() {
  const query = document.getElementById('search-input').value.trim();
  if (!query) { loadUsers(); return; }

  try {
    const res = await fetch(`${API}/users/search/${query}`, { headers: authHeaders() });
    const users = await res.json();
    const container = document.getElementById('users-container');
    if (users.length === 0) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>No users found</p></div>';
      return;
    }
    container.innerHTML = users.map(u => renderUserCard(u)).join('');
  } catch (err) {
    console.error('Search error:', err);
  }
}

async function toggleFollow(userId) {
  try {
    const res = await fetch(`${API}/users/${userId}/follow`, { method: 'POST', headers: authHeaders() });
    const data = await res.json();
    const btn = document.getElementById(`follow-btn-${userId}`);
    if (btn) {
      if (data.following) {
        btn.innerHTML = '<i class="fas fa-user-check"></i> Following';
        btn.classList.add('following');
      } else {
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Follow';
        btn.classList.remove('following');
      }
    }
  } catch (err) {
    console.error('Follow error:', err);
  }
}

// ===== PROFILE =====
async function loadMyProfile() {
  viewProfile(currentUser.id);
}

async function viewProfile(userId) {
  // Switch to profile tab
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById('page-profile').classList.remove('hidden');

  const container = document.getElementById('profile-content');
  container.innerHTML = '<div class="loading">Loading profile...</div>';

  try {
    const [profileRes, postsRes] = await Promise.all([
      fetch(`${API}/users/${userId}`, { headers: authHeaders() }),
      fetch(`${API}/posts/user/${userId}`, { headers: authHeaders() })
    ]);

    const profile = await profileRes.json();
    const posts = await postsRes.json();
    const isMe = userId === currentUser.id;

    container.innerHTML = `
      <div class="profile-header">
        <div class="user-avatar lg">${profile.name[0].toUpperCase()}</div>
        <div class="profile-info">
          <h2>${profile.name}</h2>
          <div class="username">@${profile.username}</div>
          <div class="bio">${profile.bio || 'No bio yet'}</div>
          <div class="profile-stats">
            <div class="stat"><div class="num">${profile.posts_count}</div><div class="label">Posts</div></div>
            <div class="stat"><div class="num">${profile.followers_count}</div><div class="label">Followers</div></div>
            <div class="stat"><div class="num">${profile.following_count}</div><div class="label">Following</div></div>
          </div>
          <div class="profile-actions">
            ${isMe
              ? `<button class="btn-primary" onclick="showEditProfile()"><i class="fas fa-edit"></i> Edit Profile</button>`
              : `<button class="follow-btn ${profile.is_following ? 'following' : ''}" id="profile-follow-btn" onclick="toggleFollowProfile(${userId})">
                  <i class="fas fa-user-${profile.is_following ? 'check' : 'plus'}"></i> ${profile.is_following ? 'Following' : 'Follow'}
                </button>`
            }
          </div>
        </div>
      </div>
      ${isMe ? `
        <div id="edit-profile-section" class="hidden">
          <div class="edit-profile-form">
            <input type="text" id="edit-name" value="${profile.name}" placeholder="Your name" />
            <textarea id="edit-bio" rows="3" placeholder="Your bio...">${profile.bio || ''}</textarea>
            <div style="display:flex;gap:10px">
              <button class="btn-primary" onclick="saveProfile()"><i class="fas fa-save"></i> Save</button>
              <button class="btn-outline" onclick="hideEditProfile()">Cancel</button>
            </div>
          </div>
        </div>` : ''}
      <h3 style="font-family:var(--font-head);margin-bottom:16px">${isMe ? 'My Posts' : `Posts by ${profile.name}`}</h3>
      ${posts.length === 0
        ? `<div class="empty-state"><i class="fas fa-newspaper"></i><p>No posts yet</p></div>`
        : posts.map(post => renderPost(post)).join('')}
    `;
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><p>Error loading profile</p></div>';
  }
}

async function toggleFollowProfile(userId) {
  try {
    const res = await fetch(`${API}/users/${userId}/follow`, { method: 'POST', headers: authHeaders() });
    const data = await res.json();
    const btn = document.getElementById('profile-follow-btn');
    if (btn) {
      if (data.following) {
        btn.innerHTML = '<i class="fas fa-user-check"></i> Following';
        btn.classList.add('following');
      } else {
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Follow';
        btn.classList.remove('following');
      }
    }
  } catch (err) {
    console.error(err);
  }
}

function showEditProfile() {
  document.getElementById('edit-profile-section').classList.remove('hidden');
}
function hideEditProfile() {
  document.getElementById('edit-profile-section').classList.add('hidden');
}

async function saveProfile() {
  const name = document.getElementById('edit-name').value.trim();
  const bio = document.getElementById('edit-bio').value.trim();

  try {
    const res = await fetch(`${API}/users/profile/update`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ name, bio })
    });
    if (res.ok) {
      currentUser.name = name;
      localStorage.setItem('user', JSON.stringify(currentUser));
      updateSidebarUser();
      loadMyProfile();
    }
  } catch (err) {
    alert('Error saving profile!');
  }
}