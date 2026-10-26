// Language: JavaScript (ES2022) | Filename: app.js | Runs on: GitHub Pages (*.github.io) | Targets: Static Portfolio Live Discord & Server Renderer

const app_state = {
  portfolio: null,
  discord_profile: null,
  active_filter: 'All',
  lanyard_ws: null,
  lanyard_heartbeat: null,
  subscribed_user_id: null,
  server_telemetry: new Map()
};

const BADGE_SVGS = {
  active_developer: `<svg viewBox="0 0 24 24" fill="#00d4aa"><path d="M19.73 4.87a18.2 18.2 0 0 0-4.6-1.44c-.21.4-.4.8-.58 1.21-1.69-.25-3.4-.25-5.1 0-.18-.41-.37-.82-.59-1.2-1.6.27-3.14.75-4.6 1.43A19.04 19.04 0 0 0 .96 17.7a18.43 18.43 0 0 0 5.63 2.87c.46-.62.86-1.28 1.2-1.98-.65-.25-1.29-.55-1.9-.92.17-.12.32-.24.47-.37 3.58 1.7 7.7 1.7 11.28 0l.46.37c-.6.36-1.25.67-1.9.92.35.7.75 1.35 1.2 1.98 2.03-.63 3.94-1.6 5.64-2.87.47-4.87-.78-9.09-3.3-12.83ZM8.3 15.12c-1.1 0-2-1.02-2-2.27 0-1.24.88-2.26 2-2.26 1.11 0 2.02 1.02 2 2.26 0 1.25-.89 2.27-2 2.27Zm7.4 0c-1.1 0-2-1.02-2-2.27 0-1.24.88-2.26 2-2.26 1.11 0 2.02 1.02 2 2.26 0 1.25-.88 2.27-2 2.27Z"/></svg>`,
  verified_developer: `<svg viewBox="0 0 24 24" fill="#5865f2"><path d="M12 2L4 5.4v6.1c0 5.1 3.4 9.8 8 11 4.6-1.2 8-5.9 8-11V5.4L12 2zm-1.4 13.8L7.2 12.4l1.4-1.4 2 2 4.8-4.8 1.4 1.4-6.2 6.2z"/></svg>`,
  bravery: `<svg viewBox="0 0 24 24" fill="#9c84ef"><path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm0 4.5l4.5 2.6v4.4L12 17.5 7.5 13.5V9.1L12 6.5z"/></svg>`,
  brilliance: `<svg viewBox="0 0 24 24" fill="#f47b67"><path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm0 4.2l4.8 4.8-4.8 4.8-4.8-4.8L12 6.2z"/></svg>`,
  balance: `<svg viewBox="0 0 24 24" fill="#45ddc0"><path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm0 5a4.5 4.5 0 110 9 4.5 4.5 0 010-9z"/></svg>`,
  early_supporter: `<svg viewBox="0 0 24 24" fill="#f0b232"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.86L12 17.77 5.82 21 7 14.14 2 9.27l7.1-1.01L12 2z"/></svg>`,
  partner: `<svg viewBox="0 0 24 24" fill="#5865f2"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3z"/></svg>`,
  staff: `<svg viewBox="0 0 24 24" fill="#f23f43"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  default: `<svg viewBox="0 0 24 24" fill="#9ba3b5"><circle cx="12" cy="12" r="8"/></svg>`
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
  setTimeout(() => el.remove(), 3400);
}

function apply_theme(theme) {
  if (!theme) return;
  const root = document.documentElement;
  if (theme.accentColor) root.style.setProperty('--accent', theme.accentColor);
  if (theme.secondaryAccent) root.style.setProperty('--accent-secondary', theme.secondaryAccent);
}

function format_number(num) {
  if (num === null || num === undefined || Number.isNaN(Number(num))) return '—';
  return Number(num).toLocaleString();
}

function format_status_label(status, lanyard_connected) {
  if (!lanyard_connected) return 'Verified Discord ID';
  const map = {
    online: 'Online on Discord',
    idle: 'Idle on Discord',
    dnd: 'Do Not Disturb',
    offline: 'Offline'
  };
  return map[status] || 'Offline';
}

function apply_status_class(element, status) {
  if (!element) return;
  element.classList.remove('status-online', 'status-idle', 'status-dnd', 'status-offline');
  const valid = ['online', 'idle', 'dnd', 'offline'].includes(status) ? status : 'offline';
  element.classList.add(`status-${valid}`);
}

function get_activity_image_url(activity) {
  const large = activity?.assets?.large_image;
  if (!large) return null;
  if (large.startsWith('mp:external/')) {
    return `https://media.discordapp.net/external/${large.slice('mp:external/'.length)}`;
  }
  if (large.startsWith('spotify:')) {
    return `https://i.scdn.co/image/${large.slice('spotify:'.length)}`;
  }
  if (activity.application_id) {
    return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${large}.png`;
  }
  return null;
}

function format_elapsed(start_ms) {
  if (!start_ms) return '';
  const diff_sec = Math.max(0, Math.floor((Date.now() - start_ms) / 1000));
  const hrs = Math.floor(diff_sec / 3600);
  const mins = Math.floor((diff_sec % 3600) / 60);
  const secs = diff_sec % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} elapsed`;
  }
  return `${mins}:${String(secs).padStart(2, '0')} elapsed`;
}

function render_discord_profile(profile) {
  if (!profile) return;
  app_state.discord_profile = profile;

  const display_name = profile.global_name || profile.username;
  const handle = `@${profile.username}`;

  document.title = `${display_name} — FiveM & Discord Portfolio`;
  document.getElementById('nav-name').textContent = display_name;
  document.getElementById('nav-handle').textContent = handle;
  document.getElementById('nav-avatar').src = profile.avatar_url;
  document.getElementById('footer-brand').textContent = `${display_name} (${handle}) — FiveM Portfolio`;

  const effective_status = profile.lanyard_connected ? profile.discord_status : 'online';
  apply_status_class(document.getElementById('nav-status-dot'), effective_status);
  apply_status_class(document.getElementById('dc-status-dot'), effective_status);
  document.getElementById('dc-status-dot').title = format_status_label(
    profile.discord_status,
    profile.lanyard_connected
  );

  const banner_el = document.getElementById('dc-banner');
  if (profile.banner_url) {
    banner_el.style.backgroundImage = `url("${profile.banner_url}")`;
  } else {
    banner_el.style.backgroundImage = `linear-gradient(135deg, ${profile.banner_color || 'var(--accent)'}, #151926)`;
  }

  document.getElementById('dc-userid-short').textContent = profile.id;
  document.getElementById('dc-avatar').src = profile.avatar_url;

  const deco_el = document.getElementById('dc-decoration');
  if (profile.decoration_url) {
    deco_el.src = profile.decoration_url;
    deco_el.classList.remove('hidden');
  } else {
    deco_el.classList.add('hidden');
  }

  document.getElementById('dc-global-name').textContent = display_name;
  document.getElementById('dc-username').textContent = handle;
  document.getElementById('dc-status-label').textContent = format_status_label(
    profile.discord_status,
    profile.lanyard_connected
  );

  const clan_pill = document.getElementById('dc-clan-pill');
  const clan_badge = document.getElementById('dc-clan-badge');
  const clan_tag = document.getElementById('dc-clan-tag');
  if (profile.clan && profile.clan.tag) {
    clan_tag.textContent = profile.clan.tag;
    if (profile.clan.badge_url) {
      clan_badge.src = profile.clan.badge_url;
      clan_badge.classList.remove('hidden');
    } else {
      clan_badge.classList.add('hidden');
    }
    clan_pill.classList.remove('hidden');
  } else {
    clan_pill.classList.add('hidden');
  }

  const badges_wrap = document.getElementById('dc-badges');
  badges_wrap.innerHTML = '';
  for (const badge of profile.badges || []) {
    const item = document.createElement('span');
    item.className = 'dc-badge-item';
    item.title = badge.label;
    item.innerHTML = BADGE_SVGS[badge.id] || BADGE_SVGS.default;
    badges_wrap.appendChild(item);
  }

  render_presence_activities(profile);

  if (profile.created_timestamp) {
    const dt = new Date(profile.created_timestamp);
    document.getElementById('dc-created-at').textContent = dt.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  document.getElementById('dc-open-profile-btn').href = `https://discord.com/users/${profile.id}`;
  document.getElementById('copy-discord-label').textContent = `Copy Discord (${handle})`;
}

function render_presence_activities(profile) {
  const custom_el = document.getElementById('dc-custom-status');
  const activities_wrap = document.getElementById('dc-activities');
  activities_wrap.innerHTML = '';

  const activities = Array.isArray(profile.activities) ? profile.activities : [];
  const custom_act = activities.find((a) => a.type === 4);

  if (custom_act && (custom_act.state || custom_act.emoji)) {
    const emoji_txt = custom_act.emoji?.id
      ? `<img src="https://cdn.discordapp.com/emojis/${escape_html(custom_act.emoji.id)}.png?size=32" width="18" height="18" alt="" />`
      : custom_act.emoji?.name
        ? `<span>${escape_html(custom_act.emoji.name)}</span>`
        : '';
    custom_el.innerHTML = `${emoji_txt}<span>${escape_html(custom_act.state || '')}</span>`;
    custom_el.classList.remove('hidden');
  } else {
    custom_el.classList.add('hidden');
  }

  if (profile.listening_to_spotify && profile.spotify) {
    const sp = profile.spotify;
    const sp_box = document.createElement('div');
    sp_box.className = 'activity-box spotify-box';
    sp_box.innerHTML = `
      <div class="activity-eyebrow"><span>Listening to Spotify</span></div>
      <div class="activity-row">
        ${
          sp.album_art_url
            ? `<img class="activity-thumb" src="${escape_html(sp.album_art_url)}" alt="Album Art" />`
            : `<div class="activity-thumb-placeholder">SP</div>`
        }
        <div class="activity-details">
          <div class="activity-title">${escape_html(sp.song || 'Unknown Track')}</div>
          <div class="activity-sub">by ${escape_html(sp.artist || 'Unknown Artist')}</div>
        </div>
      </div>
    `;
    activities_wrap.appendChild(sp_box);
  }

  const rich_acts = activities.filter((a) => a.type !== 4 && a.name !== 'Spotify');
  for (const act of rich_acts.slice(0, 2)) {
    const img_url = get_activity_image_url(act);
    const elapsed = format_elapsed(act.timestamps?.start);
    const box = document.createElement('div');
    box.className = 'activity-box';
    box.innerHTML = `
      <div class="activity-eyebrow">
        <span>Playing</span>
        ${elapsed ? `<span class="mono">${escape_html(elapsed)}</span>` : ''}
      </div>
      <div class="activity-row">
        ${
          img_url
            ? `<img class="activity-thumb" src="${escape_html(img_url)}" alt="${escape_html(act.name)}" />`
            : `<div class="activity-thumb-placeholder">${escape_html((act.name || 'GM').slice(0, 2).toUpperCase())}</div>`
        }
        <div class="activity-details">
          <div class="activity-title">${escape_html(act.name || 'Application')}</div>
          ${act.details ? `<div class="activity-sub">${escape_html(act.details)}</div>` : ''}
          ${act.state ? `<div class="activity-sub">${escape_html(act.state)}</div>` : ''}
        </div>
      </div>
    `;
    activities_wrap.appendChild(box);
  }
}

function connect_lanyard_socket(user_id) {
  if (!user_id || !/^\d{15,22}$/.test(user_id)) return;
  if (app_state.subscribed_user_id === user_id && app_state.lanyard_ws?.readyState === WebSocket.OPEN) {
    return;
  }

  if (app_state.lanyard_ws) {
    try {
      app_state.lanyard_ws.close();
    } catch {}
  }
  if (app_state.lanyard_heartbeat) {
    clearInterval(app_state.lanyard_heartbeat);
    app_state.lanyard_heartbeat = null;
  }

  app_state.subscribed_user_id = user_id;

  try {
    const ws = new WebSocket('wss://api.lanyard.rest/socket');
    app_state.lanyard_ws = ws;

    ws.addEventListener('message', (event) => {
      try {
        const packet = JSON.parse(event.data);
        if (packet.op === 1 && packet.d?.heartbeat_interval) {
          ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: user_id } }));
          app_state.lanyard_heartbeat = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ op: 3 }));
          }, packet.d.heartbeat_interval);
        } else if (packet.op === 0 && (packet.t === 'INIT_STATE' || packet.t === 'PRESENCE_UPDATE')) {
          const live = packet.d;
          if (live && app_state.discord_profile && String(live.discord_user?.id || user_id) === user_id) {
            app_state.discord_profile.lanyard_connected = true;
            app_state.discord_profile.discord_status = live.discord_status || 'offline';
            app_state.discord_profile.activities = live.activities || [];
            app_state.discord_profile.spotify = live.spotify || null;
            app_state.discord_profile.listening_to_spotify = Boolean(live.listening_to_spotify);
            render_discord_profile(app_state.discord_profile);
          }
        }
      } catch {}
    });
  } catch {}
}

function render_hero(portfolio) {
  const p = portfolio.profile || {};

  const avail_pill = document.getElementById('hero-availability-pill');
  avail_pill.className = `availability-pill status-${p.availabilityStatus || 'open'}`;
  document.getElementById('hero-availability-text').textContent = p.availability || 'Commissions Open';

  const role_el = document.getElementById('hero-role-badge');
  role_el.textContent = p.roleBadge || '';
  role_el.classList.toggle('hidden', !p.roleBadge);

  document.getElementById('hero-headline').textContent = p.headline || 'FiveM Developer';
  document.getElementById('hero-tagline').textContent = p.tagline || '';

  document.getElementById('stat-exp').textContent = p.experienceYears || '—';
  document.getElementById('stat-projects').textContent = p.completedProjects || '—';
  document.getElementById('stat-resmon').textContent = p.avgResmon || '—';

  const skills_el = document.getElementById('hero-skills');
  skills_el.innerHTML = '';
  for (const skill of p.skills || []) {
    const span = document.createElement('span');
    span.className = 'skill-tag';
    span.textContent = skill;
    skills_el.appendChild(span);
  }

  const links_el = document.getElementById('hero-links');
  links_el.innerHTML = '';
  for (const lnk of p.links || []) {
    const a = document.createElement('a');
    a.className = 'btn btn-secondary';
    a.href = lnk.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = lnk.label;
    links_el.appendChild(a);
  }
}

async function render_my_server(portfolio) {
  const ms = portfolio.myServer || {};
  const section = document.getElementById('discord-hub');
  const nav_hub = document.getElementById('nav-hub-link');
  const nav_join = document.getElementById('nav-join-btn');

  if (ms.enabled === false) {
    section.classList.add('hidden');
    nav_hub.classList.add('hidden');
    nav_join.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  nav_hub.classList.remove('hidden');

  document.getElementById('my-server-heading').textContent = ms.sectionTitle || 'Official Discord Hub';
  document.getElementById('ms-cta-text').textContent = ms.ctaText || 'Join Discord Server';

  const highlights_wrap = document.getElementById('ms-highlights');
  highlights_wrap.innerHTML = '';
  for (const item of ms.highlights || []) {
    const chip = document.createElement('span');
    chip.className = 'highlight-chip';
    chip.textContent = item;
    highlights_wrap.appendChild(chip);
  }

  const clean_code = gh_clean_invite_code(ms.inviteCode);
  let resolved_invite = null;
  if (clean_code) {
    const res = await gh_resolve_discord_invite(clean_code);
    if (res.ok && res.data) resolved_invite = res.data;
  }

  const server_name = ms.customName || resolved_invite?.name || 'My Discord Community';
  const server_desc =
    ms.customDescription ||
    resolved_invite?.description ||
    'Join our Discord community for FiveM development updates, scripts, and commissions.';
  const icon_url = ms.customIcon || resolved_invite?.icon_url || '';
  const banner_url = ms.customBanner || resolved_invite?.banner_url || '';
  const invite_url = clean_code ? `https://discord.gg/${clean_code}` : '#discord-hub';

  document.getElementById('ms-name').textContent = server_name;
  document.getElementById('ms-description').textContent = server_desc;
  document.getElementById('ms-invite-pill').textContent = clean_code
    ? `discord.gg/${clean_code}`
    : 'Configure invite in Admin';

  document.getElementById('ms-online-count').textContent = resolved_invite
    ? format_number(resolved_invite.online_count)
    : '—';
  document.getElementById('ms-member-count').textContent = resolved_invite
    ? format_number(resolved_invite.member_count)
    : '—';

  const icon_el = document.getElementById('ms-icon');
  const fallback_el = document.getElementById('ms-icon-fallback');
  if (icon_url) {
    icon_el.src = icon_url;
    icon_el.classList.remove('hidden');
    fallback_el.classList.add('hidden');
  } else {
    icon_el.classList.add('hidden');
    fallback_el.textContent = server_name.slice(0, 2).toUpperCase();
    fallback_el.classList.remove('hidden');
  }

  const banner_el = document.getElementById('ms-banner');
  banner_el.style.backgroundImage = banner_url ? `url("${banner_url}")` : '';

  document.getElementById('ms-join-btn').href = invite_url;
  if (clean_code) {
    nav_join.href = invite_url;
    nav_join.classList.remove('hidden');
  } else {
    nav_join.classList.add('hidden');
  }

  const layout_el = document.getElementById('my-server-layout');
  const widget_wrap = document.getElementById('ms-widget-wrap');
  const widget_iframe = document.getElementById('ms-widget-iframe');
  if (ms.widgetServerId) {
    layout_el.classList.add('has-widget');
    widget_wrap.classList.remove('hidden');
    widget_iframe.src = `https://discord.com/widget?id=${encodeURIComponent(ms.widgetServerId)}&theme=dark`;
  } else {
    layout_el.classList.remove('has-widget');
    widget_wrap.classList.add('hidden');
  }
}

function render_framework_filters(servers) {
  const bar = document.getElementById('framework-filters');
  bar.innerHTML = '';

  const frameworks = ['All'];
  for (const srv of servers) {
    if (srv.framework && !frameworks.includes(srv.framework)) {
      frameworks.push(srv.framework);
    }
  }

  for (const fw of frameworks) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `filter-btn${app_state.active_filter === fw ? ' active' : ''}`;
    btn.textContent = fw;
    btn.addEventListener('click', () => {
      app_state.active_filter = fw;
      render_framework_filters(servers);
      render_recent_servers_grid(servers);
    });
    bar.appendChild(btn);
  }
}

function render_recent_servers_grid(servers) {
  const grid = document.getElementById('servers-grid');
  grid.innerHTML = '';

  const filtered =
    app_state.active_filter === 'All'
      ? servers
      : servers.filter((s) => s.framework === app_state.active_filter);

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="form-card"><p class="muted-text">No servers listed yet.</p></div>`;
    return;
  }

  for (const srv of filtered) {
    const dc_info = app_state.server_telemetry.get(srv.id) || null;
    const clean_inv = gh_clean_invite_code(srv.discordInvite);
    const clean_cfx = gh_clean_cfx_code(srv.cfxCode);

    const banner_src = srv.bannerUrl || dc_info?.banner_url || '';
    const logo_src = srv.logoUrl || dc_info?.icon_url || '';
    const initials = (srv.name || 'SV')
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] || '')
      .join('')
      .toUpperCase();

    let telemetry_html = '';
    if (dc_info) {
      telemetry_html += `
        <span class="telemetry-pill">
          <span class="count-dot online"></span>
          <span>${format_number(dc_info.online_count)} Online &bull; ${format_number(dc_info.member_count)} Members</span>
        </span>
      `;
    }

    let actions_html = '';
    if (clean_inv) {
      actions_html += `<a href="https://discord.gg/${encodeURIComponent(clean_inv)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">Discord</a>`;
    }
    if (clean_cfx) {
      actions_html += `<a href="https://cfx.re/join/${encodeURIComponent(clean_cfx)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">Connect FiveM</a>`;
    }

    const card = document.createElement('article');
    card.className = 'server-card';
    card.innerHTML = `
      <div class="srv-banner" ${banner_src ? `style="background-image: url('${escape_html(banner_src)}')"` : ''}>
        <div class="srv-badges-top">
          ${srv.framework ? `<span class="srv-framework-pill">${escape_html(srv.framework)}</span>` : ''}
          <span class="srv-status-pill ${escape_html(srv.status || 'Completed')}">${escape_html(srv.status || 'Completed')}</span>
        </div>
      </div>
      <div class="srv-body">
        <div class="srv-logo-wrap">
          ${logo_src ? `<img src="${escape_html(logo_src)}" alt="${escape_html(srv.name)}" />` : `<span>${escape_html(initials)}</span>`}
        </div>
        <h3 class="srv-title">${escape_html(srv.name)}</h3>
        <div class="srv-meta">
          <span>${escape_html(srv.role || 'Developer')}</span>
          ${srv.period ? `<span class="srv-period">&bull; ${escape_html(srv.period)}</span>` : ''}
        </div>
        <div class="srv-live-strip">${telemetry_html}</div>
        <p class="srv-desc">${escape_html(srv.description || '')}</p>
        <div class="srv-tags">
          ${(srv.tags || []).map((t) => `<span class="srv-tag">${escape_html(t)}</span>`).join('')}
        </div>
        <div class="srv-actions">${actions_html}</div>
      </div>
    `;
    grid.appendChild(card);
  }
}

async function hydrate_servers(servers) {
  await Promise.all(
    servers.map(async (srv) => {
      const code = gh_clean_invite_code(srv.discordInvite);
      if (!code) return;
      const res = await gh_resolve_discord_invite(code);
      if (res.ok && res.data) {
        app_state.server_telemetry.set(srv.id, res.data);
      }
    })
  );
  render_recent_servers_grid(servers);
}

async function init_portfolio() {
  try {
    const res = await fetch(`./portfolio.json?t=${Date.now()}`, { cache: 'no-store' });
    const portfolio = await res.json();
    app_state.portfolio = portfolio;

    apply_theme(portfolio.theme);
    render_hero(portfolio);

    const servers = portfolio.recentServers || [];
    render_framework_filters(servers);
    render_recent_servers_grid(servers);

    render_my_server(portfolio);
    hydrate_servers(servers);

    if (portfolio.discordUserId) {
      const dc_res = await gh_resolve_discord_user(portfolio.discordUserId);
      if (dc_res.ok && dc_res.data) {
        render_discord_profile(dc_res.data);
        connect_lanyard_socket(portfolio.discordUserId);
      }
    }
  } catch (err) {
    show_toast('Could not load portfolio.json', true);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('keydown', (e) => {
    if (e.altKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      window.location.href = './admin.html';
    }
  });

  document.getElementById('copy-discord-btn').addEventListener('click', async () => {
    const username = app_state.discord_profile?.username || app_state.portfolio?.discordUserId || '';
    if (!username) return;
    await navigator.clipboard.writeText(username);
    show_toast(`Copied Discord username: ${username}`);
  });

  document.getElementById('dc-copy-id-btn').addEventListener('click', async () => {
    const id = app_state.discord_profile?.id || app_state.portfolio?.discordUserId || '';
    if (!id) return;
    await navigator.clipboard.writeText(id);
    show_toast(`Copied Discord User ID: ${id}`);
  });

  document.getElementById('ms-copy-invite-btn').addEventListener('click', async () => {
    const code = gh_clean_invite_code(app_state.portfolio?.myServer?.inviteCode);
    if (!code) return;
    const url = `https://discord.gg/${code}`;
    await navigator.clipboard.writeText(url);
    show_toast(`Copied invite link: ${url}`);
  });

  init_portfolio();
});
