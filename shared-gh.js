// Language: JavaScript (ES2022) | Filename: shared-gh.js | Runs on: GitHub Pages (*.github.io) | Targets: Browser Discord Lookup, WebCrypto Vault, & GitHub API Publisher

const GH_BADGE_FLAGS = [
  { bit: 1 << 0, id: 'staff', label: 'Discord Staff' },
  { bit: 1 << 1, id: 'partner', label: 'Partnered Server Owner' },
  { bit: 1 << 2, id: 'hypesquad_events', label: 'HypeSquad Events' },
  { bit: 1 << 3, id: 'bug_hunter_1', label: 'Bug Hunter' },
  { bit: 1 << 6, id: 'bravery', label: 'HypeSquad Bravery' },
  { bit: 1 << 7, id: 'brilliance', label: 'HypeSquad Brilliance' },
  { bit: 1 << 8, id: 'balance', label: 'HypeSquad Balance' },
  { bit: 1 << 9, id: 'early_supporter', label: 'Early Supporter' },
  { bit: 1 << 14, id: 'bug_hunter_2', label: 'Golden Bug Hunter' },
  { bit: 1 << 17, id: 'verified_developer', label: 'Early Verified Bot Developer' },
  { bit: 1 << 18, id: 'certified_moderator', label: 'Moderator Programs Alumni' },
  { bit: 1 << 22, id: 'active_developer', label: 'Active Developer' }
];

function gh_clean_invite_code(raw_input) {
  const trimmed = String(raw_input || '').trim();
  if (!trimmed) return '';
  const match = trimmed.match(/(?:discord\.gg\/|discord(?:app)?\.com\/invite\/)([A-Za-z0-9-]+)/i);
  if (match) return match[1];
  const bare = trimmed.replace(/^\/+|\/+$/g, '');
  return /^[A-Za-z0-9-]+$/.test(bare) ? bare : '';
}

function gh_clean_cfx_code(raw_input) {
  const trimmed = String(raw_input || '').trim();
  if (!trimmed) return '';
  const match = trimmed.match(/(?:cfx\.re\/join\/)([A-Za-z0-9]+)/i);
  if (match) return match[1];
  const connect_match = trimmed.match(/^connect\s+([A-Za-z0-9]+)$/i);
  if (connect_match) return connect_match[1];
  return /^[A-Za-z0-9]{4,12}$/.test(trimmed) ? trimmed : '';
}

async function gh_fetch_json(url, timeout_ms = 6500) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeout_ms) });
    if (!res.ok) return { ok: false, status: res.status };
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function gh_decode_badges(flags_num) {
  const flags = Number(flags_num) || 0;
  return GH_BADGE_FLAGS.filter((b) => (flags & b.bit) === b.bit).map((b) => ({
    id: b.id,
    label: b.label
  }));
}

function gh_snowflake_timestamp(id_str) {
  try {
    return Number((BigInt(id_str) >> 22n) + 1420070400000n);
  } catch {
    return null;
  }
}

function gh_avatar_url(user_id, avatar_hash) {
  if (avatar_hash) {
    const ext = avatar_hash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${user_id}/${avatar_hash}.${ext}?size=512`;
  }
  try {
    const idx = Number((BigInt(user_id) >> 22n) % 6n);
    return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
  } catch {
    return 'https://cdn.discordapp.com/embed/avatars/0.png';
  }
}

async function gh_resolve_discord_user(raw_id, force_refresh = false) {
  const user_id = String(raw_id || '').trim();
  if (!/^\d{15,22}$/.test(user_id)) {
    return { ok: false, error: 'Discord User ID must be a 15-22 digit Snowflake.' };
  }

  const cache_key = `gh_dc_user_${user_id}`;
  if (!force_refresh) {
    try {
      const hit = JSON.parse(sessionStorage.getItem(cache_key) || 'null');
      if (hit && Date.now() < hit.exp) return { ok: true, data: hit.val };
    } catch {}
  }

  const [lanyard_res, japi_res] = await Promise.all([
    gh_fetch_json(`https://api.lanyard.rest/v1/users/${user_id}`),
    gh_fetch_json(`https://japi.rest/discord/v1/user/${user_id}`)
  ]);

  const lanyard_payload = lanyard_res.ok && lanyard_res.data?.success ? lanyard_res.data.data : null;
  const japi_user = japi_res.ok && japi_res.data?.data ? japi_res.data.data : null;

  if (!lanyard_payload && !japi_user) {
    return { ok: false, error: 'Could not find a Discord user for that User ID.' };
  }

  const lanyard_user = lanyard_payload?.discord_user || null;
  const primary = japi_user || lanyard_user;

  const username = primary.username || lanyard_user?.username || 'unknown';
  const global_name =
    primary.global_name ||
    lanyard_user?.global_name ||
    lanyard_user?.display_name ||
    username;

  const avatar_hash = primary.avatar || lanyard_user?.avatar || null;
  const banner_hash = japi_user?.banner || null;
  const banner_url = banner_hash
    ? `https://cdn.discordapp.com/banners/${user_id}/${banner_hash}.${banner_hash.startsWith('a_') ? 'gif' : 'png'}?size=1024`
    : japi_user?.bannerURL || null;

  const banner_color =
    japi_user?.banner_color ||
    (typeof primary.accent_color === 'number'
      ? `#${primary.accent_color.toString(16).padStart(6, '0')}`
      : '#1e2235');

  const deco_asset =
    japi_user?.avatar_decoration_data?.asset ||
    lanyard_user?.avatar_decoration_data?.asset ||
    null;

  const raw_clan =
    japi_user?.primary_guild ||
    japi_user?.clan ||
    lanyard_user?.primary_guild ||
    lanyard_user?.clan ||
    null;

  let clan = null;
  if (raw_clan && raw_clan.tag) {
    clan = {
      tag: raw_clan.tag,
      badge_url:
        raw_clan.identity_guild_id && raw_clan.badge
          ? `https://cdn.discordapp.com/clan-badges/${raw_clan.identity_guild_id}/${raw_clan.badge}.png?size=64`
          : null
    };
  }

  const flags = japi_user?.public_flags ?? lanyard_user?.public_flags ?? 0;

  const profile = {
    id: user_id,
    username,
    global_name,
    avatar_url: gh_avatar_url(user_id, avatar_hash),
    banner_url,
    banner_color,
    decoration_url: deco_asset
      ? `https://cdn.discordapp.com/avatar-decoration-presets/${deco_asset}.png?size=240`
      : null,
    clan,
    badges: gh_decode_badges(flags),
    created_timestamp: gh_snowflake_timestamp(user_id),
    lanyard_connected: Boolean(lanyard_payload),
    discord_status: lanyard_payload?.discord_status || 'offline',
    activities: lanyard_payload?.activities || [],
    spotify: lanyard_payload?.spotify || null,
    listening_to_spotify: Boolean(lanyard_payload?.listening_to_spotify)
  };

  try {
    sessionStorage.setItem(cache_key, JSON.stringify({ exp: Date.now() + 60000, val: profile }));
  } catch {}

  return { ok: true, data: profile };
}

async function gh_resolve_discord_invite(raw_input, force_refresh = false) {
  const code = gh_clean_invite_code(raw_input);
  if (!code) return { ok: false, error: 'Invalid Discord invite code.' };

  const cache_key = `gh_dc_inv_${code.toLowerCase()}`;
  if (!force_refresh) {
    try {
      const hit = JSON.parse(sessionStorage.getItem(cache_key) || 'null');
      if (hit && Date.now() < hit.exp) return { ok: true, data: hit.val };
    } catch {}
  }

  const res = await gh_fetch_json(
    `https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true&with_expiration=true`
  );

  if (!res.ok || !res.data?.guild) {
    return { ok: false, error: 'Discord invite could not be resolved or has expired.' };
  }

  const guild = res.data.guild;
  const icon_ext = guild.icon && guild.icon.startsWith('a_') ? 'gif' : 'png';
  const banner_ext = guild.banner && guild.banner.startsWith('a_') ? 'gif' : 'png';

  const info = {
    code,
    invite_url: `https://discord.gg/${code}`,
    guild_id: guild.id,
    name: guild.name,
    description: guild.description || '',
    icon_url: guild.icon
      ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${icon_ext}?size=256`
      : null,
    banner_url: guild.banner
      ? `https://cdn.discordapp.com/banners/${guild.id}/${guild.banner}.${banner_ext}?size=1024`
      : guild.splash
        ? `https://cdn.discordapp.com/splashes/${guild.id}/${guild.splash}.png?size=1024`
        : null,
    online_count: res.data.approximate_presence_count ?? 0,
    member_count: res.data.approximate_member_count ?? 0
  };

  try {
    sessionStorage.setItem(cache_key, JSON.stringify({ exp: Date.now() + 120000, val: info }));
  } catch {}

  return { ok: true, data: info };
}

/* WebCrypto AES-256-GCM Vault for GitHub Pages Password Protection */

function bytes_to_b64(bytes) {
  let binary = '';
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}

function b64_to_bytes(b64) {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function utf8_to_b64(str) {
  return bytes_to_b64(new TextEncoder().encode(str));
}

async function derive_aes_key(password, salt_bytes) {
  const key_material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt_bytes,
      iterations: 250000,
      hash: 'SHA-256'
    },
    key_material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function gh_encrypt_vault(password, payload_obj) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await derive_aes_key(password, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload_obj));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return {
    version: 1,
    kdf: 'PBKDF2-SHA256-250k',
    cipher: 'AES-256-GCM',
    salt: bytes_to_b64(salt),
    iv: bytes_to_b64(iv),
    ciphertext: bytes_to_b64(encrypted)
  };
}

async function gh_decrypt_vault(password, envelope) {
  try {
    const salt = b64_to_bytes(envelope.salt);
    const iv = b64_to_bytes(envelope.iv);
    const ciphertext = b64_to_bytes(envelope.ciphertext);
    const key = await derive_aes_key(password, salt);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    const parsed = JSON.parse(new TextDecoder().decode(decrypted));
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, error: 'Incorrect admin password.' };
  }
}

function gh_detect_repo_from_url() {
  const host = window.location.hostname || '';
  if (!host.endsWith('.github.io')) return { repo: '', base_dir: '' };
  const owner = host.slice(0, -'.github.io'.length);
  const parts = window.location.pathname.split('/').filter(Boolean);
  if (parts.length > 0 && !parts[0].endsWith('.html')) {
    const repo_name = parts[0];
    const sub = parts.slice(1, -1).join('/');
    return { repo: `${owner}/${repo_name}`, base_dir: sub };
  }
  return { repo: `${owner}/${owner}.github.io`, base_dir: '' };
}

async function gh_verify_repo_access(repo, pat) {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: 'application/vnd.github+json'
      }
    });
    if (!res.ok) {
      return { ok: false, error: `GitHub returned HTTP ${res.status}. Check repo name and token permissions.` };
    }
    const info = await res.json();
    return { ok: true, default_branch: info.default_branch || 'main' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function gh_put_repo_file({ repo, branch, pat, file_path, base64_content, message }) {
  const clean_path = file_path.replace(/^\/+/, '');
  const api_url = `https://api.github.com/repos/${repo}/contents/${clean_path}`;
  const headers = {
    Authorization: `Bearer ${pat}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json'
  };

  let existing_sha = null;
  const get_res = await fetch(`${api_url}?ref=${encodeURIComponent(branch)}`, { headers });
  if (get_res.ok) {
    const existing = await get_res.json();
    existing_sha = existing.sha || null;
  }

  const body = {
    message: message || `Update ${clean_path} via Portfolio Admin Vault`,
    content: base64_content,
    branch
  };
  if (existing_sha) body.sha = existing_sha;

  const put_res = await fetch(api_url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body)
  });

  if (!put_res.ok) {
    const err_json = await put_res.json().catch(() => ({}));
    return {
      ok: false,
      error: err_json.message || `GitHub API HTTP ${put_res.status}`
    };
  }

  return { ok: true };
}
