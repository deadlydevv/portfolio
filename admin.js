// Language: JavaScript (ES2022) | Filename: admin.js | Runs on: GitHub Pages (*.github.io) | Targets: AES-256-GCM Vault Auth & Direct GitHub Commits

const SESSION_CRED_KEY = 'fivem_gh_unlocked_creds';

const admin_state = {
  vault_envelope: null,
  creds: null, // { repo, branch, base_dir, pat }
  draft: null,
  dirty: false
};

function escape_html(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function show_toast(message, is_error = false) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast${is_error ? ' toast-error' : ''}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}

function format_number(num) {
  if (num === null || num === undefined || Number.isNaN(Number(num))) return '—';
  return Number(num).toLocaleString();
}

function apply_theme(theme) {
  if (!theme) return;
  const root = document.documentElement;
  if (theme.accentColor) root.style.setProperty('--accent', theme.accentColor);
  if (theme.secondaryAccent) root.style.setProperty('--accent-secondary', theme.secondaryAccent);
}

function set_dirty(dirty = true) {
  admin_state.dirty = dirty;
  document.getElementById('studio-unsaved').classList.toggle('hidden', !dirty);
}

function switch_pane(pane_id) {
  document.querySelectorAll('.studio-nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.pane === pane_id);
  });
  document.querySelectorAll('.studio-pane').forEach((pane) => {
    pane.classList.toggle('active', pane.id === pane_id);
  });
}

function repo_path(rel_file) {
  const prefix = admin_state.creds?.base_dir ? `${admin_state.creds.base_dir}/` : '';
  return `${prefix}${rel_file}`.replace(/^\/+/, '');
}

function show_only(screen_id) {
  for (const id of ['setup-screen', 'vault-screen', 'studio-screen']) {
    document.getElementById(id).classList.toggle('hidden', id !== screen_id);
  }
}

async function load_portfolio_json() {
  const res = await fetch(`./portfolio.json?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Could not load portfolio.json');
  return res.json();
}

async function init_gh_admin() {
  try {
    const pf = await load_portfolio_json();
    admin_state.draft = structuredClone(pf);
    apply_theme(pf.theme);
  } catch {}

  const detected = gh_detect_repo_from_url();
  if (detected.repo) {
    document.getElementById('setup-repo').value = detected.repo;
  }

  /* Check if session already unlocked in this tab */
  try {
    const cached = JSON.parse(sessionStorage.getItem(SESSION_CRED_KEY) || 'null');
    if (cached && cached.repo && cached.pat) {
      admin_state.creds = cached;
      await enter_studio();
      return;
    }
  } catch {}

  /* Check if vault.json exists in repo */
  try {
    const v_res = await fetch(`./vault.json?t=${Date.now()}`, { cache: 'no-store' });
    if (v_res.ok) {
      const env = await v_res.json();
      if (env && env.ciphertext && env.salt && env.iv) {
        admin_state.vault_envelope = env;
        show_only('vault-screen');
        document.getElementById('vault-password-input').focus();
        return;
      }
    }
  } catch {}

  show_only('setup-screen');
}

async function enter_studio() {
  if (!admin_state.draft) {
    admin_state.draft = await load_portfolio_json();
  }
  show_only('studio-screen');
  populate_studio_fields(admin_state.draft);
  set_dirty(false);
}

function populate_studio_fields(draft) {
  const p = draft.profile || {};
  const ms = draft.myServer || {};
  const th = draft.theme || {};

  document.getElementById('adm-discord-id').value = draft.discordUserId || '';
  document.getElementById('adm-headline').value = p.headline || '';
  document.getElementById('adm-role-badge').value = p.roleBadge || '';
  document.getElementById('adm-availability').value = p.availability || '';
  document.getElementById('adm-availability-status').value = p.availabilityStatus || 'open';
  document.getElementById('adm-tagline').value = p.tagline || '';
  document.getElementById('adm-stat-exp').value = p.experienceYears || '';
  document.getElementById('adm-stat-projects').value = p.completedProjects || '';
  document.getElementById('adm-stat-resmon').value = p.avgResmon || '';
  document.getElementById('adm-skills').value = (p.skills || []).join(', ');

  render_links_editor(p.links || []);

  document.getElementById('adm-ms-enabled').checked = ms.enabled !== false;
  document.getElementById('adm-ms-invite').value = ms.inviteCode || '';
  document.getElementById('adm-ms-section-title').value = ms.sectionTitle || '';
  document.getElementById('adm-ms-custom-name').value = ms.customName || '';
  document.getElementById('adm-ms-desc').value = ms.customDescription || '';
  document.getElementById('adm-ms-cta').value = ms.ctaText || '';
  document.getElementById('adm-ms-widget-id').value = ms.widgetServerId || '';
  document.getElementById('adm-ms-highlights').value = (ms.highlights || []).join(', ');
  document.getElementById('adm-ms-icon').value = ms.customIcon || '';
  document.getElementById('adm-ms-banner').value = ms.customBanner || '';

  render_servers_editor(draft.recentServers || []);

  const acc = th.accentColor || '#ef4444';
  const sec = th.secondaryAccent || '#f59e0b';
  document.getElementById('adm-accent-color').value = acc;
  document.getElementById('adm-accent-hex').value = acc;
  document.getElementById('adm-secondary-color').value = sec;
  document.getElementById('adm-secondary-hex').value = sec;
}

function render_links_editor(links) {
  const wrap = document.getElementById('adm-links-list');
  wrap.innerHTML = '';

  links.forEach((lnk, idx) => {
    const row = document.createElement('div');
    row.className = 'link-editor-row';
    row.innerHTML = `
      <input type="text" class="input" placeholder="Label" value="${escape_html(lnk.label)}" data-lnk-label="${idx}" />
      <input type="url" class="input" placeholder="https://..." value="${escape_html(lnk.url)}" data-lnk-url="${idx}" />
      <button type="button" class="btn btn-danger btn-sm" data-lnk-del="${idx}">&times;</button>
    `;
    wrap.appendChild(row);
  });

  wrap.querySelectorAll('[data-lnk-label]').forEach((inp) => {
    inp.addEventListener('input', (e) => {
      admin_state.draft.profile.links[Number(e.target.dataset.lnkLabel)].label = e.target.value;
      set_dirty(true);
    });
  });

  wrap.querySelectorAll('[data-lnk-url]').forEach((inp) => {
    inp.addEventListener('input', (e) => {
      admin_state.draft.profile.links[Number(e.target.dataset.lnkUrl)].url = e.target.value;
      set_dirty(true);
    });
  });

  wrap.querySelectorAll('[data-lnk-del]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      admin_state.draft.profile.links.splice(Number(e.currentTarget.dataset.lnkDel), 1);
      render_links_editor(admin_state.draft.profile.links);
      set_dirty(true);
    });
  });
}

function render_servers_editor(servers) {
  const list = document.getElementById('adm-servers-list');
  list.innerHTML = '';

  if (servers.length === 0) {
    list.innerHTML = `<div class="form-card"><p class="muted-text">No servers listed yet. Click <strong>+ Add Server</strong> above.</p></div>`;
    return;
  }

  servers.forEach((srv, idx) => {
    const card = document.createElement('div');
    card.className = 'srv-editor-card';
    card.innerHTML = `
      <div class="srv-editor-header">
        <span class="srv-editor-title">#${idx + 1} — ${escape_html(srv.name || 'Untitled Server')}</span>
        <div class="srv-editor-controls">
          <button type="button" class="btn btn-secondary btn-xs" data-srv-up="${idx}" ${idx === 0 ? 'disabled' : ''}>Move Up</button>
          <button type="button" class="btn btn-secondary btn-xs" data-srv-down="${idx}" ${idx === servers.length - 1 ? 'disabled' : ''}>Move Down</button>
          <button type="button" class="btn btn-danger btn-xs" data-srv-del="${idx}">Delete</button>
        </div>
      </div>

      <div class="form-grid-3">
        <div>
          <label class="field-label">Server Name</label>
          <input type="text" class="input" value="${escape_html(srv.name)}" data-srv-field="name" data-idx="${idx}" />
        </div>
        <div>
          <label class="field-label">Your Role</label>
          <input type="text" class="input" value="${escape_html(srv.role)}" data-srv-field="role" data-idx="${idx}" />
        </div>
        <div>
          <label class="field-label">Framework</label>
          <input type="text" class="input" value="${escape_html(srv.framework)}" data-srv-field="framework" data-idx="${idx}" />
        </div>
      </div>

      <div class="form-grid-3">
        <div>
          <label class="field-label">Period / Year</label>
          <input type="text" class="input" value="${escape_html(srv.period)}" data-srv-field="period" data-idx="${idx}" />
        </div>
        <div>
          <label class="field-label">Status</label>
          <select class="input" data-srv-field="status" data-idx="${idx}">
            <option value="Active" ${srv.status === 'Active' ? 'selected' : ''}>Active</option>
            <option value="Completed" ${srv.status === 'Completed' ? 'selected' : ''}>Completed</option>
            <option value="Partner" ${srv.status === 'Partner' ? 'selected' : ''}>Partner</option>
          </select>
        </div>
        <div>
          <label class="field-label">Tags (comma-separated)</label>
          <input type="text" class="input" value="${escape_html((srv.tags || []).join(', '))}" data-srv-tags="${idx}" />
        </div>
      </div>

      <div class="form-grid-2">
        <div>
          <label class="field-label">Server Discord Invite (Optional)</label>
          <div class="input-action-row">
            <input type="text" class="input mono" value="${escape_html(srv.discordInvite)}" placeholder="discord.gg/code" data-srv-field="discordInvite" data-idx="${idx}" />
            <button type="button" class="btn btn-secondary btn-sm" data-test-srv-dc="${idx}">Test</button>
          </div>
        </div>
        <div>
          <label class="field-label">FiveM CFX Join Code (Optional)</label>
          <input type="text" class="input mono" value="${escape_html(srv.cfxCode)}" placeholder="cfx.re/join/code" data-srv-field="cfxCode" data-idx="${idx}" />
        </div>
      </div>

      <div id="srv-preview-${idx}" class="lookup-preview hidden"></div>

      <div>
        <label class="field-label">Work Summary / Deliverables</label>
        <textarea rows="2" class="input" data-srv-field="description" data-idx="${idx}">${escape_html(srv.description)}</textarea>
      </div>

      <div class="form-grid-2">
        <div>
          <label class="field-label">Logo URL (Optional)</label>
          <div class="input-action-row">
            <input type="text" class="input" value="${escape_html(srv.logoUrl)}" data-srv-field="logoUrl" data-idx="${idx}" />
            <label class="btn btn-secondary btn-file">
              Upload
              <input type="file" accept="image/*" data-srv-upload="logoUrl" data-idx="${idx}" hidden />
            </label>
          </div>
        </div>
        <div>
          <label class="field-label">Banner URL (Optional)</label>
          <div class="input-action-row">
            <input type="text" class="input" value="${escape_html(srv.bannerUrl)}" data-srv-field="bannerUrl" data-idx="${idx}" />
            <label class="btn btn-secondary btn-file">
              Upload
              <input type="file" accept="image/*" data-srv-upload="bannerUrl" data-idx="${idx}" hidden />
            </label>
          </div>
        </div>
      </div>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll('[data-srv-field]').forEach((el) => {
    el.addEventListener('input', (e) => {
      const i = Number(e.target.dataset.idx);
      const field = e.target.dataset.srvField;
      admin_state.draft.recentServers[i][field] = e.target.value;
      if (field === 'name') {
        const title_el = e.target.closest('.srv-editor-card')?.querySelector('.srv-editor-title');
        if (title_el) title_el.textContent = `#${i + 1} — ${e.target.value || 'Untitled Server'}`;
      }
      set_dirty(true);
    });
  });

  list.querySelectorAll('[data-srv-tags]').forEach((el) => {
    el.addEventListener('input', (e) => {
      const i = Number(e.target.dataset.srvTags);
      admin_state.draft.recentServers[i].tags = e.target.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      set_dirty(true);
    });
  });

  list.querySelectorAll('[data-srv-up]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const i = Number(e.currentTarget.dataset.srvUp);
      if (i > 0) {
        const arr = admin_state.draft.recentServers;
        [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
        render_servers_editor(arr);
        set_dirty(true);
      }
    });
  });

  list.querySelectorAll('[data-srv-down]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const i = Number(e.currentTarget.dataset.srvDown);
      const arr = admin_state.draft.recentServers;
      if (i < arr.length - 1) {
        [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
        render_servers_editor(arr);
        set_dirty(true);
      }
    });
  });

  list.querySelectorAll('[data-srv-del]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const i = Number(e.currentTarget.dataset.srvDel);
      admin_state.draft.recentServers.splice(i, 1);
      render_servers_editor(admin_state.draft.recentServers);
      set_dirty(true);
    });
  });

  list.querySelectorAll('[data-test-srv-dc]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const i = Number(e.currentTarget.dataset.testSrvDc);
      const raw = admin_state.draft.recentServers[i].discordInvite;
      const box = document.getElementById(`srv-preview-${i}`);
      box.classList.remove('hidden');
      box.textContent = 'Testing Discord invite...';

      const res = await gh_resolve_discord_invite(raw, true);
      if (!res.ok || !res.data) {
        box.innerHTML = `<span class="error-text">${escape_html(res.error || 'Invite not found')}</span>`;
        return;
      }
      box.innerHTML = `
        ${res.data.icon_url ? `<img src="${escape_html(res.data.icon_url)}" alt="" />` : ''}
        <div>
          <div><strong>${escape_html(res.data.name)}</strong></div>
          <div class="muted-text">${format_number(res.data.online_count)} Online &bull; ${format_number(res.data.member_count)} Members</div>
        </div>
      `;
    });
  });

  list.querySelectorAll('[data-srv-upload]').forEach((file_inp) => {
    file_inp.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const i = Number(e.target.dataset.idx);
      const field = e.target.dataset.srvUpload;
      const url = await upload_image_to_github(file);
      if (url) {
        admin_state.draft.recentServers[i][field] = url;
        render_servers_editor(admin_state.draft.recentServers);
        set_dirty(true);
      }
    });
  });
}

function collect_payload() {
  const d = admin_state.draft;
  d.discordUserId = document.getElementById('adm-discord-id').value.trim();

  d.profile.headline = document.getElementById('adm-headline').value.trim();
  d.profile.roleBadge = document.getElementById('adm-role-badge').value.trim();
  d.profile.availability = document.getElementById('adm-availability').value.trim();
  d.profile.availabilityStatus = document.getElementById('adm-availability-status').value;
  d.profile.tagline = document.getElementById('adm-tagline').value.trim();
  d.profile.experienceYears = document.getElementById('adm-stat-exp').value.trim();
  d.profile.completedProjects = document.getElementById('adm-stat-projects').value.trim();
  d.profile.avgResmon = document.getElementById('adm-stat-resmon').value.trim();
  d.profile.skills = document
    .getElementById('adm-skills')
    .value.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  d.myServer.enabled = document.getElementById('adm-ms-enabled').checked;
  d.myServer.inviteCode = gh_clean_invite_code(document.getElementById('adm-ms-invite').value);
  d.myServer.sectionTitle = document.getElementById('adm-ms-section-title').value.trim();
  d.myServer.customName = document.getElementById('adm-ms-custom-name').value.trim();
  d.myServer.customDescription = document.getElementById('adm-ms-desc').value.trim();
  d.myServer.ctaText = document.getElementById('adm-ms-cta').value.trim();
  d.myServer.widgetServerId = document.getElementById('adm-ms-widget-id').value.replace(/\D/g, '');
  d.myServer.highlights = document
    .getElementById('adm-ms-highlights')
    .value.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  d.myServer.customIcon = document.getElementById('adm-ms-icon').value.trim();
  d.myServer.customBanner = document.getElementById('adm-ms-banner').value.trim();

  d.recentServers = (d.recentServers || []).map((s) => ({
    ...s,
    discordInvite: gh_clean_invite_code(s.discordInvite),
    cfxCode: gh_clean_cfx_code(s.cfxCode)
  }));

  d.theme.accentColor = document.getElementById('adm-accent-hex').value.trim();
  d.theme.secondaryAccent = document.getElementById('adm-secondary-hex').value.trim();

  return d;
}

async function upload_image_to_github(file) {
  if (!admin_state.creds) {
    show_toast('Unlock vault first', true);
    return null;
  }
  if (file.size > 8 * 1024 * 1024) {
    show_toast('Image must be 8MB or smaller', true);
    return null;
  }

  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
  const rel_name = `uploads/img_${Date.now()}.${ext || 'png'}`;

  const buf = await file.arrayBuffer();
  const b64 = bytes_to_b64(new Uint8Array(buf));

  show_toast('Uploading image to GitHub...');
  const put = await gh_put_repo_file({
    repo: admin_state.creds.repo,
    branch: admin_state.creds.branch,
    pat: admin_state.creds.pat,
    file_path: repo_path(rel_name),
    base64_content: b64,
    message: `Upload ${rel_name}`
  });

  if (!put.ok) {
    show_toast(put.error || 'Upload failed', true);
    return null;
  }

  show_toast('Image committed to GitHub');
  return `./${rel_name}`;
}

async function save_and_publish_to_github() {
  if (!admin_state.creds) return;
  const btn = document.getElementById('studio-save-btn');
  btn.disabled = true;
  btn.textContent = 'Publishing...';

  const payload = collect_payload();
  const json_str = JSON.stringify(payload, null, 2);

  const res = await gh_put_repo_file({
    repo: admin_state.creds.repo,
    branch: admin_state.creds.branch,
    pat: admin_state.creds.pat,
    file_path: repo_path('portfolio.json'),
    base64_content: utf8_to_b64(json_str),
    message: 'Update portfolio.json via Admin Vault'
  });

  btn.disabled = false;
  btn.textContent = 'Save & Publish to GitHub';

  if (!res.ok) {
    show_toast(res.error || 'Failed to publish to GitHub', true);
    return;
  }

  set_dirty(false);
  show_toast('Published to GitHub Pages! Live site updates in ~20s.');
}

function bind_gh_events() {
  /* 1-Time Vault Creation */
  document.getElementById('vault-setup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err_el = document.getElementById('setup-error');
    const btn = document.getElementById('setup-submit-btn');
    err_el.classList.add('hidden');

    const repo = document.getElementById('setup-repo').value.trim().replace(/^\/+|\/+$/g, '');
    const pat = document.getElementById('setup-pat').value.trim();
    const password = document.getElementById('setup-password').value;

    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
      err_el.textContent = 'Repo must be formatted as username/reponame';
      err_el.classList.remove('hidden');
      return;
    }
    if (password.length < 4) {
      err_el.textContent = 'Password must be at least 4 characters';
      err_el.classList.remove('hidden');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Verifying Repo & Encrypting...';

    const check = await gh_verify_repo_access(repo, pat);
    if (!check.ok) {
      btn.disabled = false;
      btn.textContent = 'Encrypt Vault & Unlock Admin';
      err_el.textContent = check.error;
      err_el.classList.remove('hidden');
      return;
    }

    const detected = gh_detect_repo_from_url();
    const creds = {
      repo,
      branch: check.default_branch,
      base_dir: detected.base_dir || '',
      pat
    };

    const envelope = await gh_encrypt_vault(password, creds);
    admin_state.creds = creds;
    admin_state.vault_envelope = envelope;

    const put = await gh_put_repo_file({
      repo: creds.repo,
      branch: creds.branch,
      pat: creds.pat,
      file_path: repo_path('vault.json'),
      base64_content: utf8_to_b64(JSON.stringify(envelope, null, 2)),
      message: 'Initialize encrypted AES-256-GCM Admin Vault'
    });

    btn.disabled = false;
    btn.textContent = 'Encrypt Vault & Unlock Admin';

    if (!put.ok) {
      err_el.textContent = `Could not write vault.json: ${put.error} (Ensure Contents permission is Read and write)`;
      err_el.classList.remove('hidden');
      return;
    }

    sessionStorage.setItem(SESSION_CRED_KEY, JSON.stringify(creds));
    await enter_studio();
    show_toast('Encrypted vault.json committed to GitHub!');
  });

  /* Show/Hide Password */
  document.getElementById('toggle-pw-visibility').addEventListener('click', (e) => {
    const inp = document.getElementById('vault-password-input');
    const showing = inp.type === 'text';
    inp.type = showing ? 'password' : 'text';
    e.currentTarget.textContent = showing ? 'SHOW' : 'HIDE';
  });

  document.getElementById('reset-vault-link').addEventListener('click', () => {
    show_only('setup-screen');
  });

  /* Normal Vault Login */
  document.getElementById('vault-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err_el = document.getElementById('vault-error');
    const btn = document.getElementById('vault-submit-btn');
    err_el.classList.add('hidden');
    btn.disabled = true;
    btn.textContent = 'Decrypting...';

    const pw = document.getElementById('vault-password-input').value;
    const dec = await gh_decrypt_vault(pw, admin_state.vault_envelope);

    btn.disabled = false;
    btn.textContent = 'Unlock Admin Dashboard';

    if (!dec.ok || !dec.data?.pat) {
      err_el.textContent = 'Incorrect admin password.';
      err_el.classList.remove('hidden');
      return;
    }

    admin_state.creds = dec.data;
    sessionStorage.setItem(SESSION_CRED_KEY, JSON.stringify(dec.data));
    document.getElementById('vault-password-input').value = '';
    await enter_studio();
    show_toast('Vault unlocked');
  });

  /* Lock Vault */
  document.getElementById('studio-logout-btn').addEventListener('click', () => {
    admin_state.creds = null;
    sessionStorage.removeItem(SESSION_CRED_KEY);
    if (admin_state.vault_envelope) {
      show_only('vault-screen');
    } else {
      window.location.reload();
    }
    show_toast('Vault locked');
  });

  document.querySelectorAll('.studio-nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => switch_pane(btn.dataset.pane));
  });

  document.getElementById('studio-save-btn').addEventListener('click', save_and_publish_to_github);

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && admin_state.creds) {
      e.preventDefault();
      save_and_publish_to_github();
    }
  });

  document.querySelectorAll('#studio-screen input, #studio-screen textarea, #studio-screen select').forEach((el) => {
    if (['adm-current-pw', 'adm-new-pw', 'adm-confirm-pw', 'adm-import-input'].includes(el.id)) return;
    el.addEventListener('input', () => set_dirty(true));
  });

  /* Test Discord User ID */
  document.getElementById('adm-test-id-btn').addEventListener('click', async () => {
    const id = document.getElementById('adm-discord-id').value.trim();
    const preview = document.getElementById('adm-id-preview');
    preview.classList.remove('hidden');
    preview.textContent = 'Looking up Discord User ID...';

    const res = await gh_resolve_discord_user(id, true);
    if (!res.ok || !res.data) {
      preview.innerHTML = `<span class="error-text">${escape_html(res.error || 'User not found')}</span>`;
      return;
    }
    const u = res.data;
    preview.innerHTML = `
      <img src="${escape_html(u.avatar_url)}" alt="" />
      <div>
        <div><strong>${escape_html(u.global_name)}</strong> <span class="mono muted-text">@${escape_html(u.username)}</span></div>
        <div class="muted-text">${u.lanyard_connected ? `Live Presence (${escape_html(u.discord_status)})` : 'Profile synced'}</div>
      </div>
    `;
  });

  /* Test My Server Invite */
  document.getElementById('adm-test-invite-btn').addEventListener('click', async () => {
    const raw = document.getElementById('adm-ms-invite').value.trim();
    const preview = document.getElementById('adm-invite-preview');
    preview.classList.remove('hidden');
    preview.textContent = 'Checking Discord invite...';

    const res = await gh_resolve_discord_invite(raw, true);
    if (!res.ok || !res.data) {
      preview.innerHTML = `<span class="error-text">${escape_html(res.error || 'Invite invalid')}</span>`;
      return;
    }
    const g = res.data;
    preview.innerHTML = `
      ${g.icon_url ? `<img src="${escape_html(g.icon_url)}" alt="" />` : ''}
      <div>
        <div><strong>${escape_html(g.name)}</strong></div>
        <div class="muted-text">${format_number(g.online_count)} Online &bull; ${format_number(g.member_count)} Members</div>
      </div>
    `;
  });

  document.getElementById('adm-add-link-btn').addEventListener('click', () => {
    admin_state.draft.profile.links.push({ label: 'Website', url: 'https://' });
    render_links_editor(admin_state.draft.profile.links);
    set_dirty(true);
  });

  document.getElementById('adm-add-server-btn').addEventListener('click', () => {
    admin_state.draft.recentServers.unshift({
      id: `srv-${Date.now()}`,
      name: 'New FiveM Server',
      role: 'Lead Developer',
      period: '2026 - Active',
      status: 'Active',
      framework: 'ESX',
      description: 'Custom scripts, UI engineering, and performance tuning.',
      tags: ['ESX', 'Lua 5.4', 'NUI'],
      discordInvite: '',
      cfxCode: '',
      bannerUrl: '',
      logoUrl: ''
    });
    render_servers_editor(admin_state.draft.recentServers);
    set_dirty(true);
  });

  document.querySelectorAll('[data-upload-input]').forEach((inp) => {
    inp.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = await upload_image_to_github(file);
      if (url) {
        document.getElementById(e.target.dataset.uploadInput).value = url;
        set_dirty(true);
      }
    });
  });

  /* Rotate Vault Password */
  document.getElementById('adm-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const cur_pw = document.getElementById('adm-current-pw').value;
    const new_pw = document.getElementById('adm-new-pw').value;
    const conf_pw = document.getElementById('adm-confirm-pw').value;

    if (new_pw.length < 4) {
      show_toast('New password must be at least 4 characters', true);
      return;
    }
    if (new_pw !== conf_pw) {
      show_toast('New passwords do not match', true);
      return;
    }

    if (admin_state.vault_envelope) {
      const check = await gh_decrypt_vault(cur_pw, admin_state.vault_envelope);
      if (!check.ok) {
        show_toast('Current password is incorrect', true);
        return;
      }
    }

    const new_env = await gh_encrypt_vault(new_pw, admin_state.creds);
    const put = await gh_put_repo_file({
      repo: admin_state.creds.repo,
      branch: admin_state.creds.branch,
      pat: admin_state.creds.pat,
      file_path: repo_path('vault.json'),
      base64_content: utf8_to_b64(JSON.stringify(new_env, null, 2)),
      message: 'Rotate AES-256-GCM Admin Vault password'
    });

    if (!put.ok) {
      show_toast(put.error || 'Could not update vault.json', true);
      return;
    }

    admin_state.vault_envelope = new_env;
    document.getElementById('adm-current-pw').value = '';
    document.getElementById('adm-new-pw').value = '';
    document.getElementById('adm-confirm-pw').value = '';
    document.getElementById('adm-pw-status').textContent = 'Vault password updated on GitHub.';
    show_toast('Admin password rotated');
  });

  /* Theme Pickers */
  const set_colors = (acc, sec) => {
    document.getElementById('adm-accent-color').value = acc;
    document.getElementById('adm-accent-hex').value = acc;
    document.getElementById('adm-secondary-color').value = sec;
    document.getElementById('adm-secondary-hex').value = sec;
    apply_theme({ accentColor: acc, secondaryAccent: sec });
    set_dirty(true);
  };

  document.querySelectorAll('.preset-chip').forEach((chip) => {
    chip.addEventListener('click', () => set_colors(chip.dataset.accent, chip.dataset.secondary));
  });

  document.getElementById('adm-accent-color').addEventListener('input', (e) => {
    document.getElementById('adm-accent-hex').value = e.target.value;
    apply_theme({ accentColor: e.target.value });
  });

  document.getElementById('adm-accent-hex').addEventListener('input', (e) => {
    if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
      document.getElementById('adm-accent-color').value = e.target.value;
      apply_theme({ accentColor: e.target.value });
    }
  });

  document.getElementById('adm-secondary-color').addEventListener('input', (e) => {
    document.getElementById('adm-secondary-hex').value = e.target.value;
    apply_theme({ secondaryAccent: e.target.value });
  });

  document.getElementById('adm-secondary-hex').addEventListener('input', (e) => {
    if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
      document.getElementById('adm-secondary-color').value = e.target.value;
      apply_theme({ secondaryAccent: e.target.value });
    }
  });

  /* Export & Import */
  document.getElementById('adm-export-btn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(collect_payload(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'portfolio.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById('adm-import-input').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      admin_state.draft = JSON.parse(await file.text());
      populate_studio_fields(admin_state.draft);
      set_dirty(true);
      show_toast('Backup imported — click Save & Publish');
    } catch {
      show_toast('Invalid JSON file', true);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bind_gh_events();
  init_gh_admin();
});
