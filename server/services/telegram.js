import { config } from '../config.js';
import { state, saveBans, saveWhitelist, savePremium, loadBans, loadPremium, signCallback, verifyCallback, canNotify, ipToCallbackId, callbackIdToIP } from '../state.js';
import { readJSON, writeJSON } from '../storage.js';
import { escapeHTML } from '../lib/utils.js';
import { lookupIP } from './geo.js';

const LIST_PAGES = new Map();
const STATS_MSGS = new Map();
const ITEMS_PER_PAGE = 15;

function signData(action, ip) {
  return signCallback(action, ip);
}

function buildAdminMenu(chatId, msgId) {
  const s = computeStats();
  const text = [
    `🛠️ <b>Admin Panel — Actions rapides</b>`,
    ``,
    `👥 Visites: <b>${s.totalVisits}</b>  |  🌐 IP uniques: <b>${s.uniqueIPs}</b>`,
    `🚫 Bannis: <b>${s.bans}</b>  |  💎 Premium: <b>${s.premiums}</b>  |  ✅ Whitelistés: <b>${s.whitelisted}</b>`,
    `📢 Pubs aujourd'hui: <b>${s.adsToday}</b>  |  Total: <b>${s.adsTotal}</b>`,
  ].join('\n');

  const keyboard = [
    [
      { text: '📊 Stats', callback_data: 'admin_stats' },
      { text: '📋 Liste IPs', callback_data: 'admin_list' },
    ],
    [
      { text: '📢 Push Ad', callback_data: 'push_ad' },
    ],
  ];

  if (config.PANEL_ENABLED) {
    keyboard.push([{ text: '🔐 Panel Web', url: `${config.SITE_URL}/panel` }]);
  }

  keyboard.push([{ text: '🔄 Rafraîchir', callback_data: 'admin_refresh' }]);

  if (!config.BOT_TOKEN) return;
  const url = msgId
    ? `https://api.telegram.org/bot${config.BOT_TOKEN}/editMessageText`
    : `https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`;
  const body = msgId
    ? { chat_id: chatId, message_id: msgId, text, parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } }
    : { chat_id: chatId, text, parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } };
  return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

function sendAdminMenu(chatId) {
  return buildAdminMenu(chatId, null);
}

function computeStats() {
  const totalVisits = state.VISITS.length;
  const uniqueIPs = new Set(state.VISITS.map(v => v.ip)).size;
  const datacenterCount = state.VISITS.filter(v => v.isDatacenter).length;
  const proxyCount = state.VISITS.filter(v => v.isProxy).length;
  const bannedCount = state.VISITS.filter(v => v.isBanned).length;
  const mobileCount = state.VISITS.filter(v => v.deviceType === 'mobile').length;
  const tabletCount = state.VISITS.filter(v => v.deviceType === 'tablette').length;
  const desktopCount = state.VISITS.filter(v => v.deviceType === 'desktop').length;

  const browserCounts = {};
  for (const v of state.VISITS) {
    if (v.browser && v.browser !== 'Unknown') {
      browserCounts[v.browser] = (browserCounts[v.browser] || 0) + 1;
    }
  }
  const topBrowsers = Object.entries(browserCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const osCounts = {};
  for (const v of state.VISITS) {
    if (v.os && v.os !== 'Unknown') {
      osCounts[v.os] = (osCounts[v.os] || 0) + 1;
    }
  }
  const topOS = Object.entries(osCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const countryCounts = {};
  for (const v of state.VISITS) {
    if (v.country === 'Local' || v.country === 'Unknown') continue;
    const c = v.countryCode || v.country.slice(0, 2).toUpperCase();
    countryCounts[c] = (countryCounts[c] || 0) + 1;
  }
  const topCountries = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const channelCounts = {};
  for (const v of state.VISITS) {
    if (v.channelName) {
      channelCounts[v.channelName] = (channelCounts[v.channelName] || 0) + 1;
    }
  }
  const topChannels = Object.entries(channelCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const referrerCounts = {};
  for (const v of state.VISITS) {
    if (v.referrer && v.referrer !== 'Direct') {
      try {
        const host = new URL(v.referrer).hostname;
        referrerCounts[host] = (referrerCounts[host] || 0) + 1;
      } catch {
        referrerCounts[v.referrer] = (referrerCounts[v.referrer] || 0) + 1;
      }
    }
  }
  const topReferrers = Object.entries(referrerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const bans = state.BANS_LOOKUP.size;
  const premiums = state.PREMIUM_LOOKUP.size;
  const whitelisted = state.WHITELIST_LOOKUP.size;

  const adsTotal = state.ADS_DATA?.total || 0;
  const adsToday = state.ADS_DATA?.today || 0;

  return {
    totalVisits, uniqueIPs, datacenterCount, proxyCount, bannedCount,
    mobileCount, tabletCount, desktopCount,
    topBrowsers, topOS, topCountries, topChannels, topReferrers,
    bans, premiums, whitelisted, adsTotal, adsToday,
  };
}

function buildStatsMessage(fromAdmin) {
  const s = computeStats();
  const browsers = s.topBrowsers.map(([name, count]) => `  • ${name}: ${count}`).join('\n');
  const oses = s.topOS.map(([name, count]) => `  • ${name}: ${count}`).join('\n');
  const countries = s.topCountries.map(([cc, count]) => `  • ${cc}: ${count}`).join('\n');
  const channels = s.topChannels.map(([name, count]) => `  • ${escapeHTML(name)}: ${count}`).join('\n');
  const referrers = s.topReferrers.map(([name, count]) => `  • ${escapeHTML(name)}: ${count}`).join('\n');

  const parts = [
    `📊 <b>Statistiques WebTV</b>`,
    ``,
    `👥 <b>Visites</b>`,
    `  • Total: <b>${s.totalVisits}</b>`,
    `  • IP uniques: <b>${s.uniqueIPs}</b>`,
    `  • Datacenters: ${s.datacenterCount}`,
    `  • Proxys: ${s.proxyCount}`,
    `  • Bannis: ${s.bannedCount}`,
    ``,
    `📱 <b>Appareils</b>`,
    `  • Mobile: ${s.mobileCount}`,
    `  • Tablette: ${s.tabletCount}`,
    `  • Desktop: ${s.desktopCount}`,
  ];
  if (s.topBrowsers.length) parts.push(``, `🌐 <b>Navigateurs</b>`, browsers);
  if (s.topOS.length) parts.push(``, `💿 <b>Systèmes</b>`, oses);
  if (s.topCountries.length) parts.push(``, `🌍 <b>Pays</b>`, countries);
  if (s.topChannels.length) parts.push(``, `📺 <b>Chaînes les + regardées</b>`, channels);
  if (s.topReferrers.length) parts.push(``, `🔗 <b>D'où ils viennent</b>`, referrers);
  parts.push(
    ``,
    `🔒 <b>Modération</b>`,
    `  • Bannis: <b>${s.bans}</b>`,
    `  • Premium: <b>${s.premiums}</b>`,
    `  • Whitelistés: <b>${s.whitelisted}</b>`,
    ``,
    `📢 <b>Publicités</b>`,
    `  • Total: <b>${s.adsTotal}</b>`,
    `  • Aujourd'hui: <b>${s.adsToday}</b>`,
  );
  const text = parts.join('\n');

  const row1 = [{ text: '🔄 Refresh', callback_data: 'stats_refresh' }];
  if (fromAdmin) {
    row1.push({ text: '📋 Liste IPs', callback_data: 'admin_list' });
    row1.push({ text: '🔙 Retour', callback_data: 'admin_back' });
  } else {
    row1.push({ text: '📋 Liste IPs', callback_data: 'stats_list' });
  }
  const keyboard = [row1, [{ text: '✖ Fermer', callback_data: 'admin_close' }]];

  return { text, keyboard };
}

export async function sendTelegram(text, ip) {
  if (!config.BOT_TOKEN || !config.CHAT_ID) return;
  if (!canNotify()) {
    console.log('[Telegram] Throttle: notification ignorée (5 notifs/30s)');
    return;
  }
  if (text.length > 3900) text = text.slice(0, 3900) + '\n\n... (tronqué)';
  const chatIds = String(config.CHAT_ID).split(',').map(id => id.trim());
  const reply_markup = { inline_keyboard: [] };
  if (ip) {
    const cid = ipToCallbackId(ip);
    const sigCaptcha = signData('captcha', ip);
    const sigPush = signData('push', ip);
    const sigBan = signData('ban', ip);
    const sigPremium = signData('premium', ip);
    const sigRedirect = signData('redirect', ip);
    reply_markup.inline_keyboard.push([
      { text: '🧩 Captcha', callback_data: `captcha_${cid}_${sigCaptcha}` },
      { text: '📢 Push', callback_data: `push_ip_${cid}_${sigPush}` },
    ]);
    reply_markup.inline_keyboard.push([
      { text: '💎 Premium', callback_data: `premium_${cid}_${sigPremium}` },
      { text: '⛔ Bloquer', callback_data: `block_${cid}_${sigBan}` },
    ]);
    reply_markup.inline_keyboard.push([
      { text: '🔄 Rediriger', callback_data: `redirect_menu_${cid}_${sigRedirect}` },
    ]);
  }
  if (config.PANEL_ENABLED) {
    const lastRow = reply_markup.inline_keyboard[reply_markup.inline_keyboard.length - 1] || [];
    lastRow.push({ text: '🔐 Panel', url: `${config.SITE_URL}/panel` });
    if (lastRow.length > 0 && reply_markup.inline_keyboard[reply_markup.inline_keyboard.length - 1] !== lastRow) {
      reply_markup.inline_keyboard.push(lastRow);
    }
  }

  for (const chatId of chatIds) {
    try {
      const resp = await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          reply_markup,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        console.error(`[Telegram] Erreur envoi: ${err.error_code || resp.status} — ${err.description || 'unknown'}`);
      } else {
        console.log('[Telegram] Notification envoyee');
      }
    } catch (e) {
      console.error('[Telegram] Erreur:', e.message);
    }
  }
}

async function sendRedirectMenu(chatId, msgId, ip) {
  const cid = ipToCallbackId(ip);
  const keyboard = [
    [
      { text: '🏠 Accueil', callback_data: `redir_${cid}_accueil_${signData('redir', ip)}` },
      { text: '▶️ Player', callback_data: `redir_${cid}_player_${signData('redir', ip)}` },
    ],
    [
      { text: '⚙️ Réglages', callback_data: `redir_${cid}_settings_${signData('redir', ip)}` },
      { text: '📡 IPTV', callback_data: `redir_${cid}_iptv_${signData('redir', ip)}` },
    ],
    [
      { text: '✖ Annuler', callback_data: 'admin_close' },
    ],
  ];
  if (!config.BOT_TOKEN) return;
  const label = `🔄 Redirection — <code>${escapeHTML(ip)}</code>\nChoisir la page cible :`;
  const body = msgId
    ? { chat_id: chatId, message_id: msgId, text: label, parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } }
    : { chat_id: chatId, text: label, parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } };
  const url = msgId
    ? `https://api.telegram.org/bot${config.BOT_TOKEN}/editMessageText`
    : `https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`;
  await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

async function sendListPage(chatId, page, filter) {
  const { text, keyboard } = await buildList(filter || 'all', page);
  const info = LIST_PAGES.get(chatId);
  if (info?.fromAdmin) keyboard.push([{ text: '🔙 Retour Admin', callback_data: 'admin_back' }]);
  if (config.BOT_TOKEN) {
    await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } }),
    });
  }
}

async function buildList(filter, page) {
  const bans = readJSON(config.BANS_FILE);
  const premiums = readJSON(config.PREMIUM_FILE);
  const premiumIPs = new Set(premiums.map(p => p.ip));
  const banIPs = new Set(bans.map(b => b.ip));

  const allIPs = [];
  const seen = new Set();
  for (const v of state.VISITS) {
    if (!seen.has(v.ip)) {
      seen.add(v.ip);
      allIPs.push(v);
    }
  }

  const basicIPs = allIPs.filter(v => !premiumIPs.has(v.ip) && !banIPs.has(v.ip));

  function fmtDate(d) {
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    } catch { return '?'; }
  }

  function formatPremium(x) {
    return `💎  <code>${escapeHTML(x.ip)}</code>  ·  ${fmtDate(x.date)}`;
  }
  function formatBan(b) {
    const reason = b.reason ? `\n      ↳ ${escapeHTML(b.reason)}` : '';
    return `🚫  <code>${escapeHTML(b.ip)}</code>${reason}`;
  }
  function formatBasic(v) {
    const flag = v.countryCode ? v.countryCode.toUpperCase() : '??';
    const loc = v.country && v.country !== 'Unknown' ? v.country : '';
    return `🟢  <code>${escapeHTML(v.ip)}</code>  ${flag}${loc ? ' · ' + escapeHTML(loc) : ''}`;
  }

  const total = { premium: premiums.length, ban: bans.length, basic: basicIPs.length };

  if (filter === 'all') {
    const MAX_PREVIEW = 8;
    const premShow = premiums.slice(0, MAX_PREVIEW);
    const banShow = bans.slice(0, MAX_PREVIEW);
    const basicShow = basicIPs.slice(0, MAX_PREVIEW);

    const premLines = premShow.length > 0
      ? premShow.map(formatPremium).join('\n')
      : '<i>Aucun</i>';
    const banLines = banShow.length > 0
      ? banShow.map(formatBan).join('\n')
      : '<i>Aucun</i>';
    const basicLines = basicShow.length > 0
      ? basicShow.map(formatBasic).join('\n')
      : '<i>Aucun</i>';

    const premOverflow = premiums.length > MAX_PREVIEW ? `  <i>(+${premiums.length - MAX_PREVIEW})</i>` : '';
    const banOverflow = bans.length > MAX_PREVIEW ? `  <i>(+${bans.length - MAX_PREVIEW})</i>` : '';
    const basicOverflow = basicIPs.length > MAX_PREVIEW ? `  <i>(+${basicIPs.length - MAX_PREVIEW})</i>` : '';

    const text = [
      `📋 <b>Liste des IPs</b>`,
      ``,
      `💎 <b>VIP</b> <code>${total.premium}</code>${premOverflow}`,
      premLines,
      ``,
      `🚫 <b>Bloqués</b> <code>${total.ban}</code>${banOverflow}`,
      banLines,
      ``,
      `🟢 <b>Visiteurs</b> <code>${total.basic}</code>${basicOverflow}`,
      basicLines,
    ].join('\n');

    const keyboard = [
      [
        { text: `💎 VIP · ${total.premium}`, callback_data: 'list_filter_premium' },
        { text: `🚫 Bloqués · ${total.ban}`, callback_data: 'list_filter_ban' },
      ],
      [
        { text: `🟢 Visiteurs · ${total.basic}`, callback_data: 'list_filter_basic' },
      ],
      [
        { text: '✖ Fermer', callback_data: 'list_close' },
      ],
    ];

    return { text, keyboard, totalPages: 1, page: 0 };
  }

  const items = filter === 'premium' ? premiums : filter === 'ban' ? bans : basicIPs;
  const formatter = filter === 'premium' ? formatPremium : filter === 'ban' ? formatBan : formatBasic;
  const label = filter === 'premium' ? '💎 <b>VIP</b>' : filter === 'ban' ? '🚫 <b>Bloqués</b>' : '🟢 <b>Visiteurs</b>';
  const totalPages = Math.max(Math.ceil(items.length / ITEMS_PER_PAGE), 1);
  const p = Math.max(0, Math.min(page, totalPages - 1));
  const start = p * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;

  const lines = items.length > 0
    ? items.slice(start, end).map(formatter).join('\n')
    : '<i>Aucune IP dans cette catégorie</i>';

  const text = [
    `${label}  ·  <code>${items.length}</code> IPs`,
    `Page ${p + 1}/${totalPages}`,
    ``,
    lines,
  ].join('\n');

  const keyboard = [
    [
      { text: `←`, callback_data: 'list_prev' },
      { text: `📋 Tous`, callback_data: 'list_filter_all' },
      { text: `→`, callback_data: 'list_next' },
    ],
  ];

  return { text, keyboard, totalPages, page: p };
}

async function editListMessage(chatId, msgId, page, filter) {
  const { text, keyboard } = await buildList(filter || 'all', page);
  const info = LIST_PAGES.get(chatId);
  if (info?.fromAdmin) keyboard.push([{ text: '🔙 Retour Admin', callback_data: 'admin_back' }]);
  if (config.BOT_TOKEN) {
    await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: msgId, text, parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } }),
    });
  }
}

export async function registerTelegramWebhook() {
  if (!config.BOT_TOKEN || !config.WEBHOOK_URL) {
    console.log('[Telegram] Webhook registration skipped (WEBHOOK_URL not set)');
    return;
  }
  const webhookUrl = `${config.WEBHOOK_URL}/api/telegram-webhook`;
  try {
    const params = new URLSearchParams({ url: webhookUrl });
    if (config.TELEGRAM_WEBHOOK_SECRET) params.set('secret_token', config.TELEGRAM_WEBHOOK_SECRET);
    const resp = await fetch(
      `https://api.telegram.org/bot${config.BOT_TOKEN}/setWebhook?${params}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const data = await resp.json();
    if (data.ok) {
      console.log('[Telegram] Webhook registered:', webhookUrl);
    } else {
      console.error('[Telegram] Webhook registration failed:', JSON.stringify(data).replace(/bot\d+:.*?@/g, 'bot***@'));
    }
  } catch (e) {
    console.error('[Telegram] Webhook registration error (token masque pour securite)');
  }

  try {
    await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: 'Afficher les commandes disponibles' },
          { command: 'help', description: 'Afficher les commandes disponibles' },
          { command: 'admin', description: 'Menu d\'administration avec actions rapides' },
          { command: 'stats', description: 'Statistiques détaillées de la plateforme' },
          { command: 'visits', description: 'Visites totales par IP' },
          { command: 'ip', description: 'Interroger une IP (ex: /ip 1.2.3.4)' },
          { command: 'ban', description: 'Bannir une IP (ex: /ban 1.2.3.4)' },
          { command: 'unban', description: 'Débannir une IP (ex: /unban 1.2.3.4)' },
          { command: 'wait', description: 'Anti-bot: délai d\'attente (ex: /wait 30)' },
          { command: 'link', description: 'Générer un lien de partage' },
          { command: 'list', description: 'Lister les IPs Basic, VIP et bloquées' },
          { command: 'playlist', description: 'Lien playlist M3U (VLC, Kodi, TiviMate…)' },
          { command: 'smarters', description: 'Setup IPTV Smarters Pro' },
          { command: 'panel', description: 'Accéder au panneau admin' },
          { command: 'stop', description: 'Désactiver le site (redirige vers Wikipedia)' },
          { command: 'resume', description: 'Réactiver le site' },
        ],
      }),
    });
    console.log('[Telegram] Bot commands registered');
  } catch (e) {
    console.error('[Telegram] Bot commands registration error (token masque pour securite)');
  }
}

function isAuthorizedChat(chatId) {
  const authorizedIds = String(config.CHAT_ID).split(',').map(id => id.trim());
  return authorizedIds.includes(String(chatId));
}

export async function handleTelegramWebhook(update) {
  if (update.message && update.message.text) {
    const chatId = update.message.chat.id;
    const cmd = update.message.text.trim();

    if (cmd === '/start' || cmd === '/help') {
      const msg = [
        `🤖 <b>WebTV Bot</b> — Commandes disponibles :`,
        ``,
        `📊 <code>/stats</code> — Statistiques détaillées de la plateforme`,
        `📋 <code>/list</code> — Voir les IPs Basic, VIP et bloquées`,
        `👁️ <code>/visits</code> — Visites totales par IP`,
        `🔍 <code>/ip &lt;adresse&gt;</code> — Interroger une IP`,
        `   Ex: <code>/ip 52.16.245.145</code>`,
        `🚫 <code>/ban &lt;ip&gt;</code> — Bannir une IP`,
        `🔓 <code>/unban &lt;ip&gt;</code> — Débannir une IP`,
        `⏳ <code>/wait &lt;secondes&gt;</code> — Anti-bot: délai d'attente`,
        `🔗 <code>/link</code> — Générer un lien de partage`,
        `📺 <code>/playlist</code> — Lien playlist M3U (VLC, Kodi, TiviMate…)`,
        `📱 <code>/smarters</code> — Instructions setup IPTV Smarters Pro`,
        `🛠️ <code>/admin</code> — Menu administration avec actions rapides`,
        config.PANEL_ENABLED ? `🔐 <code>/panel</code> — Accéder au panneau admin` : '',
        `🛑 <code>/stop</code> — Désactiver le site (redirige vers Wikipedia)`,
        `▶️ <code>/resume</code> — Réactiver le site`,
        ``,
        `📢 Les boutons inline sur les notifications :`,
        `   • 🧩 Captcha — ⛔ Bloquer / 🔓 Débloquer`,
        `   • 💎 Premium — 📢 Push publicité`,
        `   • 🔄 Rediriger vers une page`,
        config.PANEL_ENABLED ? `   • 🔐 Panel admin` : '',
      ].filter(Boolean).join('\n');
      if (config.BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' }),
        });
      }
      console.log('[Telegram] /start ou /help');

    } else if (/^\/ip(\s|$)/i.test(cmd)) {
      const ip = cmd.replace(/^\/ip\s*/i, '').trim().replace(/^\[|\]$/g, '');
      if (!ip || !/^[\da-f:.]+$/i.test(ip)) {
        if (config.BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: `⚠️ Usage: <code>/ip &lt;adresse&gt;</code>\nEx: <code>/ip 52.16.245.145</code>\n<code>/ip 2a01:cb08:28f:ed00::1</code>`, parse_mode: 'HTML' }),
          });
        }
        console.log(`[Telegram] /ip usage invalide: "${cmd}"`);
      } else if (!isAuthorizedChat(chatId)) {
        if (config.BOT_TOKEN) { await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: `⛔ Accès refusé.`, parse_mode: 'HTML' }) }); }
      } else {
        const visit = state.VISITS.find(v => v.ip === ip);
        const isBanned = state.BANS_LOOKUP.has(ip);
        const isPremiumUser = state.PREMIUM_LOOKUP.has(ip);
        const isWhitelisted = state.WHITELIST_LOOKUP.has(ip);

        const lookup = await lookupIP(ip);
        const country = lookup?.country !== 'Unknown' ? lookup.country : (visit?.country || 'Inconnu');
        const countryCode = lookup?.countryCode !== '' ? lookup.countryCode : (visit?.countryCode || '');
        const isp = lookup?.isp !== 'Unknown' ? lookup.isp : (visit?.isp || 'Inconnu');
        const city = (lookup?.city || visit?.city || '');
        const region = (lookup?.region || visit?.region || '');

        const cityParts = [];
        if (city) cityParts.push(city);
        if (region) cityParts.push(region);
        const cityStr = cityParts.length > 0 ? cityParts.join(', ') : null;

        const mapsQ = encodeURIComponent([city, region, country].filter(Boolean).join(', ') || ip);
        const mapsLink = `https://www.google.com/maps/search/?api=1&query=${mapsQ}`;

        const ipVisits = state.IP_VISITS[ip];
        const visitCount = state.VISITS.filter(v => v.ip === ip).length;

        const lines = [
          `🔍 <b>IP Lookup:</b> <code>${escapeHTML(ip)}</code>`,
          isBanned ? '🚫 <b>Statut:</b> Banni' : isPremiumUser ? '💎 <b>Statut:</b> Premium' : isWhitelisted ? '✅ <b>Statut:</b> Whitelisté' : '🟢 <b>Statut:</b> Normal',
          visit ? `📅 <b>Dernière visite:</b> ${new Date(visit.timestamp).toLocaleString()}` : '📅 <b>Dernière visite:</b> Aucune',
          `🔢 <b>Visites totales:</b> ${visitCount}`,
          cityStr ? `🏙️ <b>Ville:</b> ${escapeHTML(cityStr)}` : null,
          `🌍 <b>Pays:</b> ${escapeHTML(country)} ${escapeHTML(countryCode)}`,
          `📡 <b>ISP:</b> ${escapeHTML(isp)}`,
          visit ? `📱 <b>Appareil:</b> ${visit.deviceType || 'Inconnu'} — ${visit.browser || '?'} ${visit.os || ''}` : null,
          visit ? `📺 <b>Chaîne:</b> ${escapeHTML(visit.channelName || 'Aucune')}` : null,
          `🗺️ <a href="${mapsLink}">Voir sur Google Maps</a>`,
        ].filter(Boolean).join('\n');

        const buttons = [];
        const cid = ipToCallbackId(ip);
        const sigCaptcha = signData('captcha', ip);
        buttons.push({ text: '🛡️ Captcha', callback_data: `captcha_${cid}_${sigCaptcha}` });
        if (isBanned) {
          const sigUnban = signData('unban', ip);
          buttons.push({ text: '🔓 Débloquer', callback_data: `unban_${cid}_${sigUnban}` });
        } else {
          const sigBan = signData('ban', ip);
          buttons.push({ text: '⛔ Bloquer', callback_data: `block_${cid}_${sigBan}` });
        }
        if (isPremiumUser) {
          const sigUnpremium = signData('unpremium', ip);
          buttons.push({ text: '🔻 Retirer Premium', callback_data: `unpremium_${cid}_${sigUnpremium}` });
        } else {
          const sigPremium = signData('premium', ip);
          buttons.push({ text: '💎 Premium', callback_data: `premium_${cid}_${sigPremium}` });
        }
        const buttons2 = [];
        const sigPush = signData('push', ip);
        buttons2.push({ text: '📢 Push Pub', callback_data: `push_ip_${cid}_${sigPush}` });
        const sigRedirect = signData('redirect', ip);
        buttons2.push({ text: '🔄 Rediriger', callback_data: `redirect_menu_${cid}_${sigRedirect}` });
        if (config.PANEL_ENABLED) {
          buttons2.push({ text: '🔐 Panel', url: `${config.SITE_URL}/panel` });
        }

        if (config.BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId, text: lines, parse_mode: 'HTML',
              disable_web_page_preview: true,
              reply_markup: { inline_keyboard: [buttons, buttons2] },
            }),
          });
        }
        console.log(`[Telegram] /ip lookup: ${ip}`);
      }
    } else if (cmd === '/list') {
      if (!isAuthorizedChat(chatId)) {
        if (config.BOT_TOKEN) { await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: `⛔ Accès refusé.`, parse_mode: 'HTML' }) }); }
      } else {
        LIST_PAGES.set(chatId, { page: 0, filter: 'all', fromAdmin: false });
        sendListPage(chatId, 0, 'all');
      }
    } else if (cmd === '/stats') {
      if (!isAuthorizedChat(chatId)) {
        if (config.BOT_TOKEN) { await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: `⛔ Accès refusé.`, parse_mode: 'HTML' }) }); }
      } else {
      const { text, keyboard } = buildStatsMessage(false);
      if (config.BOT_TOKEN) {
        const resp = await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: { inline_keyboard: keyboard } }),
        });
        const sent = await resp.json();
        if (sent.ok) {
          STATS_MSGS.set(chatId, { msgId: sent.result.message_id });
        }
      }
      console.log('[Telegram] /stats');
      }

    } else if (cmd === '/admin') {
      if (!isAuthorizedChat(chatId)) {
        if (config.BOT_TOKEN) { await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: `⛔ Accès refusé.`, parse_mode: 'HTML' }) }); }
      } else {
      await sendAdminMenu(chatId);
      console.log('[Telegram] /admin');
      }

    } else if (cmd === '/playlist' || cmd === '/smarters') {
      if (!isAuthorizedChat(chatId)) {
        if (config.BOT_TOKEN) { await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: `⛔ Accès refusé.`, parse_mode: 'HTML' }) }); }
      } else if (!config.M3U_ENABLED) {
        if (config.BOT_TOKEN) { await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: `⚠️ Les playlists M3U sont désactivées.`, parse_mode: 'HTML' }) }); }
      } else {
        const user = config.PLAYLIST_USER;
        const pass = config.PLAYLIST_PASSWORD;
        const auth = (user && pass) ? `${user}:${pass}@` : '';
        const host = config.SITE_URL.replace(/^https?:\/\//, '');
        const allUrl = `https://${auth}${host}/api/playlist.m3u`;
        const frUrl = `https://${auth}${host}/api/playlist.m3u?country=fr`;
        const publicUrl = `https://${host}/api/playlist-public.m3u`;
        let msg;
        if (cmd === '/smarters') {
          msg = [
            `📱 <b>IPTV Smarters Pro — Setup M3U</b>`,
            ``,
            `1️⃣ Ouvrir IPTV Smarters Pro`,
            `2️⃣ Sélectionner <b>"Login with M3U Playlist"</b>`,
            `3️⃣ Dans <b>Playlist Name</b> : entrer un nom (ex: 1TR4CK)`,
            `4️⃣ Dans <b>M3U URL</b> coller le lien :`,
            ``,
            `🔗 <b>Toutes les chaînes :</b>`,
            `<code>${allUrl}</code>`,
            ``,
            `🇫🇷 <b>France uniquement :</b>`,
            `<code>${frUrl}</code>`,
            ``,
            `5️⃣ Appuyer sur <b>"Add User"</b>`,
            `6️⃣ Attendre le chargement puis profiter 🎬`,
            ``,
            `⚠️ Pas de champ EPG disponible.`,
          ].join('\n');
        } else {
          msg = [
            `📺 <b>Playlist M3U</b>`,
            ``,
            `🔗 <b>Toutes les chaînes :</b>`,
            `<code>${allUrl}</code>`,
            ``,
            `🇫🇷 <b>France uniquement :</b>`,
            `<code>${frUrl}</code>`,
            ``,
            `🔓 <b>Partage (sans auth) :</b>`,
            `<code>${publicUrl}</code>`,
            ``,
            `<i>Compatible VLC, Kodi, IPTV Smarters, TiviMate…</i>`,
          ].join('\n');
        }
        if (config.BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML', disable_web_page_preview: true }),
          });
        }
        console.log(`[Telegram] ${cmd}`);
      }

    } else if (cmd === '/visits') {
      if (!isAuthorizedChat(chatId)) {
        if (config.BOT_TOKEN) { await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: `⛔ Accès refusé.`, parse_mode: 'HTML' }) }); }
      } else {
        const totalVisits = state.VISITS.length;
        const uniqueIPs = new Set(state.VISITS.map(v => v.ip)).size;
        const today = new Date().toISOString().slice(0, 10);
        const todayVisits = state.VISITS.filter(v => v.timestamp && v.timestamp.startsWith(today)).length;
        const recent = state.VISITS.slice(0, 10);
        const recentLines = recent.map(v => {
          const time = new Date(v.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          const flag = v.countryCode ? v.countryCode.toUpperCase() : '??';
          return `  <code>${escapeHTML(v.ip)}</code> [${flag}] ${escapeHTML(v.channelName || v.deviceType || '?')} — ${time}`;
        }).join('\n');
        const ipVisitsData = state.IP_VISITS || {};
        const ipVisitEntries = Object.entries(ipVisitsData)
          .sort((a, b) => (b[1].total || 0) - (a[1].total || 0))
          .slice(0, 10);
        const ipVisitLines = ipVisitEntries.map(([ip, data]) => {
          const pages = Object.entries(data.pages || {}).sort((a, b) => b[1] - a[1]);
          const topPage = pages.length > 0 ? pages[0][0] : '?';
          return `  <code>${escapeHTML(ip)}</code> — ${data.total || 0} visites (${topPage})`;
        }).join('\n');
        const msg = [
          `👁️ <b>Visites totales</b>`,
          ``,
          `📊 Total: <b>${totalVisits}</b> | IP uniques: <b>${uniqueIPs}</b> | Aujourd'hui: <b>${todayVisits}</b>`,
          ``,
          `📋 <b>Dernières visites :</b>`,
          recentLines || '  Aucune',
          ``,
          `🔝 <b>Top IPs par pages visitées :</b>`,
          ipVisitLines || '  Aucune donnée',
        ].join('\n');
        if (config.BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML', disable_web_page_preview: true }),
          });
        }
        console.log('[Telegram] /visits');
      }

    } else if (cmd.startsWith('/ban ')) {
      if (!isAuthorizedChat(chatId)) {
        if (config.BOT_TOKEN) { await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: `⛔ Accès refusé.`, parse_mode: 'HTML' }) }); }
      } else {
        const ip = cmd.slice(5).trim();
        if (!ip || !/^[\da-f:.]+$/i.test(ip)) {
          if (config.BOT_TOKEN) {
            await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text: `⚠️ Usage: <code>/ban &lt;ip&gt;</code>\nEx: <code>/ban 1.2.3.4</code>`, parse_mode: 'HTML' }),
            });
          }
        } else {
          const bans = readJSON(config.BANS_FILE);
          if (!bans.find(b => b.ip === ip)) {
            bans.push({ ip, reason: 'Banni via /ban Telegram', date: new Date().toISOString() });
            saveBans(bans);
          }
          const whitelist = readJSON(config.WHITELIST_FILE);
          if (whitelist.includes(ip)) {
            saveWhitelist(whitelist.filter(w => w !== ip));
          }
          if (config.BOT_TOKEN) {
            await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text: `🚫 <b>IP BANNIE</b>\n📍 <code>${escapeHTML(ip)}</code>`, parse_mode: 'HTML' }),
            });
          }
          console.log(`[Telegram] /ban ${ip}`);
        }
      }

    } else if (cmd.startsWith('/unban ')) {
      if (!isAuthorizedChat(chatId)) {
        if (config.BOT_TOKEN) { await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: `⛔ Accès refusé.`, parse_mode: 'HTML' }) }); }
      } else {
        const ip = cmd.slice(7).trim();
        if (!ip || !/^[\da-f:.]+$/i.test(ip)) {
          if (config.BOT_TOKEN) {
            await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text: `⚠️ Usage: <code>/unban &lt;ip&gt;</code>\nEx: <code>/unban 1.2.3.4</code>`, parse_mode: 'HTML' }),
            });
          }
        } else {
          saveBans(readJSON(config.BANS_FILE).filter(b => b.ip !== ip));
          const whitelist = readJSON(config.WHITELIST_FILE);
          if (!whitelist.includes(ip)) {
            whitelist.push(ip);
            saveWhitelist(whitelist);
          }
          if (config.BOT_TOKEN) {
            await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text: `✅ <b>IP DÉBANNIE &amp; AUTORISÉE</b>\n📍 <code>${escapeHTML(ip)}</code>`, parse_mode: 'HTML' }),
            });
          }
          console.log(`[Telegram] /unban ${ip}`);
        }
      }

    } else if (cmd.startsWith('/wait')) {
      if (!isAuthorizedChat(chatId)) {
        if (config.BOT_TOKEN) { await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: `⛔ Accès refusé.`, parse_mode: 'HTML' }) }); }
      } else {
        const arg = cmd.slice(5).trim();
        const seconds = parseInt(arg, 10);
        if (!arg || isNaN(seconds) || seconds < 0) {
          if (config.BOT_TOKEN) {
            await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text: `⚠️ Usage: <code>/wait &lt;secondes&gt;</code> (0 = désactivé)\nEx: <code>/wait 30</code>`, parse_mode: 'HTML' }),
            });
          }
        } else {
          state.WAIT_DELAY = seconds;
          const status = seconds === 0 ? 'Désactivé' : `${seconds}s activé`;
          if (config.BOT_TOKEN) {
            await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text: `⏳ <b>Anti-bot délai</b>\n⏱️ Statut: <b>${status}</b>\n\nLes visiteurs devront attendre ${seconds === 0 ? 'aucun' : seconds} seconde(s) avant l'accès.`, parse_mode: 'HTML' }),
            });
          }
          console.log(`[Telegram] /wait ${seconds}s`);
        }
      }

    } else if (cmd === '/stop') {
      if (!isAuthorizedChat(chatId)) {
        if (config.BOT_TOKEN) { await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: `⛔ Accès refusé.`, parse_mode: 'HTML' }) }); }
      } else {
        state.SITE_STOPPED = true;
        if (config.BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: `🛑 <b>Site désactivé</b>\n\nLes visiteurs sont redirigés vers Wikipedia.\nUtilisez <code>/resume</code> pour réactiver.`, parse_mode: 'HTML' }),
          });
        }
        console.log('[Telegram] /stop — site désactivé');
      }

    } else if (cmd === '/resume') {
      if (!isAuthorizedChat(chatId)) {
        if (config.BOT_TOKEN) { await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: `⛔ Accès refusé.`, parse_mode: 'HTML' }) }); }
      } else {
        state.SITE_STOPPED = false;
        if (config.BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: `▶️ <b>Site réactivé</b>\n\nLes visiteurs peuvent à nouveau accéder au site.`, parse_mode: 'HTML' }),
          });
        }
        console.log('[Telegram] /resume — site réactivé');
      }

    } else if (cmd === '/link') {
      if (!isAuthorizedChat(chatId)) {
        if (config.BOT_TOKEN) { await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: `⛔ Accès refusé.`, parse_mode: 'HTML' }) }); }
      } else {
        const siteUrl = config.SITE_URL;
        const shareUrl = `${siteUrl}/?ref=share`;
        const m3uEnabled = config.M3U_ENABLED;
        const vlcEnabled = config.VLC_ENABLED;
        const host = siteUrl.replace(/^https?:\/\//, '');
        const user = config.PLAYLIST_USER;
        const pass = config.PLAYLIST_PASSWORD;
        const auth = (user && pass) ? `${user}:${pass}@` : '';
        const allUrl = `https://${auth}${host}/api/playlist.m3u`;
        const parts = [
          `🔗 <b>Lien de partage</b>`,
          ``,
          `🌐 <b>Site :</b>`,
          `<code>${siteUrl}</code>`,
        ];
        if (m3uEnabled) {
          parts.push(``, `📺 <b>Playlist M3U :</b>`, `<code>${allUrl}</code>`);
        }
        if (vlcEnabled) {
          parts.push(``, `▶️ <b>Lien direct :</b>`, `<code>${shareUrl}</code>`);
        }
        parts.push(``, `<i>Partagez ce lien avec vos visiteurs.</i>`);
        if (config.BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: parts.join('\n'), parse_mode: 'HTML', disable_web_page_preview: true }),
          });
        }
        console.log('[Telegram] /link');
      }

    } else if (cmd === '/panel') {
      if (!isAuthorizedChat(chatId)) {
        if (config.BOT_TOKEN) { await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: `⛔ Accès refusé.`, parse_mode: 'HTML' }) }); }
      } else if (config.PANEL_ENABLED) {
        if (config.BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: `🔐 <b>Panel Admin</b>\n\n<a href="${config.SITE_URL}/panel">Ouvrir le panel →</a>`, parse_mode: 'HTML', disable_web_page_preview: true }),
          });
        }
        console.log('[Telegram] /panel');
      } else {
        if (config.BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: `⚠️ Le panel admin est actuellement désactivé.`, parse_mode: 'HTML' }),
          });
        }
        console.log('[Telegram] /panel (désactivé)');
      }

    } else {
      if (config.BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: `❌ Commande inconnue. Tape /help pour la liste des commandes.`, parse_mode: 'HTML' }),
        });
      }
      console.log(`[Telegram] Commande inconnue: "${cmd}"`);
    }
  }

  if (update.callback_query) {
    const cq = update.callback_query;
    const data = cq.data || '';
    const chatId = cq.message?.chat?.id;
    const msgId = cq.message?.message_id;

    if (!isAuthorizedChat(chatId)) {
      if (config.BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cq.id, text: '⛔ Accès refusé.', show_alert: true }),
        });
      }
      return;
    }

    console.log(`[Telegram] Callback recu: ${data}`);

    if (data.startsWith('captcha_')) {
      const parts = data.split('_');
      const cid = parts[1];
      const sig = parts[2];
      const ip = callbackIdToIP(cid);
      if (!ip || !verifyCallback('captcha', ip, sig)) {
        if (config.BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cq.id, text: '⛔ Signature invalide.', show_alert: true }),
          });
        }
        return;
      }
      state.FORCE_CAPTCHA.add(ip);
      if (config.BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cq.id, text: `🛡️ ${ip} devra resoudre un captcha a la prochaine visite`, show_alert: true }),
        });
        if (chatId && msgId) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId, message_id: msgId,
              text: `🛡️ <b>Captcha Forcé</b>\n\n<code>${escapeHTML(ip)}</code>\nProchaine visite = captcha obligatoire.`,
              parse_mode: 'HTML',
            }),
          });
        }
      }
      console.log(`[Telegram] Force captcha pour: ${ip}`);

    } else if (data.startsWith('redirect_menu_')) {
      const parts = data.split('_');
      const cid = parts[2];
      const sig = parts[3];
      const ip = callbackIdToIP(cid);
      if (!ip || !verifyCallback('redirect', ip, sig)) {
        if (config.BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cq.id, text: '⛔ Signature invalide.', show_alert: true }),
          });
        }
        return;
      }
      await sendRedirectMenu(chatId, msgId, ip);
      if (config.BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cq.id, text: `🔄 Menu redirect pour ${ip}` }),
        });
      }

    } else if (data.startsWith('redir_')) {
      const parts = data.split('_');
      const cid = parts[1];
      const page = parts[2];
      const sig = parts[3];
      const ip = callbackIdToIP(cid);
      if (!ip || !page || !verifyCallback('redir', ip, sig)) {
        if (config.BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cq.id, text: '⛔ Signature invalide.', show_alert: true }),
          });
        }
        return;
      }
      state.PENDING_REDIRECTS.set(ip, { page, expires: Date.now() + 30000 });
      if (config.BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cq.id, text: `🔄 ${ip} sera redirigé vers "${page}"`, show_alert: true }),
        });
        if (chatId && msgId) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId, message_id: msgId,
              text: `🔄 <b>Redirect envoyé</b>\n\n<code>${escapeHTML(ip)}</code> → <b>${escapeHTML(page)}</b>\nProchaine requête AJAX le redirigera.`,
              parse_mode: 'HTML',
            }),
          });
        }
      }
      console.log(`[Telegram] Redirect ${ip} -> ${page}`);

    } else if (data.startsWith('unban_')) {
      const parts = data.split('_');
      const cid = parts[1];
      const sig = parts[2];
      const ip = callbackIdToIP(cid);
      if (!ip || !verifyCallback('unban', ip, sig)) {
        if (config.BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cq.id, text: '⛔ Signature invalide.', show_alert: true }),
          });
        }
        return;
      }
      saveBans(readJSON(config.BANS_FILE).filter(b => b.ip !== ip));
      const whitelist = readJSON(config.WHITELIST_FILE);
      if (!whitelist.includes(ip)) {
        whitelist.push(ip);
        saveWhitelist(whitelist);
      }
      if (config.BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cq.id, text: `✅ ${ip} debloque et autorise`, show_alert: true }),
        });
        if (chatId && msgId) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId, message_id: msgId,
              text: `✅ <b>Débloqué &amp; Autorisé</b>\n\n<code>${escapeHTML(ip)}</code>`,
              parse_mode: 'HTML',
            }),
          });
        }
      }
      console.log(`[Telegram] Unban & Whitelist via callback: ${ip}`);
    } else if (data.startsWith('block_')) {
      const parts = data.split('_');
      const cid = parts[1];
      const sig = parts[2];
      const ip = callbackIdToIP(cid);
      if (!ip || !verifyCallback('ban', ip, sig)) {
        if (config.BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cq.id, text: '⛔ Signature invalide.', show_alert: true }),
          });
        }
        return;
      }
      const bans = readJSON(config.BANS_FILE);
      if (!bans.find(b => b.ip === ip)) {
        bans.push({ ip, reason: 'Bloqué via Telegram', date: new Date().toISOString() });
        saveBans(bans);
      }
      const whitelist = readJSON(config.WHITELIST_FILE);
      if (whitelist.includes(ip)) {
        saveWhitelist(whitelist.filter(w => w !== ip));
      }
      if (config.BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cq.id, text: `🚫 ${ip} bloqué`, show_alert: true }),
        });
        if (chatId && msgId) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId, message_id: msgId,
              text: `🚫 <b>Bloqué</b>\n\n<code>${escapeHTML(ip)}</code>`,
              parse_mode: 'HTML',
            }),
          });
        }
      }
      console.log(`[Telegram] Block via callback: ${ip}`);
    } else if (data.startsWith('premium_')) {
      const parts = data.split('_');
      const cid = parts[1];
      const sig = parts[2];
      const ip = callbackIdToIP(cid);
      if (!ip || !verifyCallback('premium', ip, sig)) {
        if (config.BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cq.id, text: '⛔ Signature invalide.', show_alert: true }),
          });
        }
        return;
      }
      const list = readJSON(config.PREMIUM_FILE);
      if (!list.find(p => p.ip === ip)) {
        list.push({ ip, date: new Date().toISOString() });
        savePremium(list);
      }
      if (config.BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cq.id, text: `💎 ${ip} est desormais Premium`, show_alert: true }),
        });
        if (chatId && msgId) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId, message_id: msgId,
              text: `💎 <b>Premium Activé</b>\n\n<code>${escapeHTML(ip)}</code>`,
              parse_mode: 'HTML',
            }),
          });
        }
      }
      console.log(`[Telegram] Premium via callback: ${ip}`);
    } else if (data.startsWith('unpremium_')) {
      const parts = data.split('_');
      const cid = parts[1];
      const sig = parts[2];
      const ip = callbackIdToIP(cid);
      if (!ip || !verifyCallback('unpremium', ip, sig)) {
        if (config.BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cq.id, text: '⛔ Signature invalide.', show_alert: true }),
          });
        }
        return;
      }
      let list = readJSON(config.PREMIUM_FILE);
      list = list.filter(p => p.ip !== ip);
      savePremium(list);
      if (config.BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cq.id, text: `🔻 ${ip} n'est plus Premium`, show_alert: true }),
        });
        if (chatId && msgId) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId, message_id: msgId,
              text: `🔻 <b>Premium Retiré</b>\n\n<code>${escapeHTML(ip)}</code>`,
              parse_mode: 'HTML',
            }),
          });
        }
      }
      console.log(`[Telegram] Unpremium via callback: ${ip}`);
    } else if (data.startsWith('push_ip_')) {
      const parts = data.split('_');
      const cid = parts[2];
      const sig = parts[3];
      const targetIP = callbackIdToIP(cid);
      if (!targetIP || !verifyCallback('push', targetIP, sig)) {
        if (config.BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cq.id, text: '⛔ Signature invalide.', show_alert: true }),
          });
        }
        return;
      }
      state.PENDING_AD_PUSH = Date.now();
      state.PENDING_AD_PUSH_IP = targetIP;
      if (config.BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cq.id, text: `📢 Pub envoyée à ${targetIP} !`, show_alert: true }),
        });
      }
      console.log(`[Telegram] Push ad ciblé vers: ${targetIP}`);
    } else if (data === 'push_ad') {
      state.PENDING_AD_PUSH = Date.now();
      state.PENDING_AD_PUSH_IP = null;
      if (config.BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cq.id, text: '📢 Pub pushée à tous les visiteurs !', show_alert: true }),
        });
      }
      console.log('[Telegram] Push ad via callback');
    } else if (data === 'stats_refresh') {
      if (config.BOT_TOKEN) {
        const { text, keyboard } = buildStatsMessage(false);
        const stored = STATS_MSGS.get(chatId);
        if (chatId && stored?.msgId) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, message_id: stored.msgId, text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: { inline_keyboard: keyboard } }),
          });
        }
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cq.id, text: '🔄 Stats mises à jour' }),
        });
      }
      console.log('[Telegram] Stats refresh');
    } else if (data === 'stats_list') {
      LIST_PAGES.set(chatId, { page: 0, filter: 'all', fromAdmin: false });
      if (config.BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cq.id, text: '📋 Liste générée' }),
        });
        if (chatId && msgId) {
          const { text, keyboard } = await buildList('all', 0);
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, message_id: msgId, text, parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } }),
          });
        }
      }
      console.log('[Telegram] Stats -> list');
    } else if (data === 'admin_stats') {
      const { text, keyboard } = buildStatsMessage(true);
      if (config.BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cq.id, text: '📊 Statistiques générées' }),
        });
        if (chatId && msgId) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, message_id: msgId, text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: { inline_keyboard: keyboard } }),
          });
        }
      }
      console.log('[Telegram] Admin stats');

    } else if (data === 'admin_list') {
      LIST_PAGES.set(chatId, { page: 0, filter: 'all', fromAdmin: true });
      if (config.BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cq.id, text: '📋 Liste générée' }),
        });
        if (chatId && msgId) {
          const { text, keyboard } = await buildList('all', 0);
          keyboard.push([{ text: '🔙 Retour Admin', callback_data: 'admin_back' }]);
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, message_id: msgId, text, parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } }),
          });
        }
      }
      console.log('[Telegram] Admin list');

    } else if (data === 'admin_refresh') {
      loadBans();
      loadPremium();
      if (config.BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cq.id, text: '✅ Données rafraîchies' }),
        });
        if (chatId && msgId) await buildAdminMenu(chatId, msgId);
      }
      console.log('[Telegram] Admin refresh');
    } else if (data === 'admin_back') {
      if (config.BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cq.id, text: '🔙 Retour au menu admin' }),
        });
      }
      if (chatId && msgId) await buildAdminMenu(chatId, msgId);
      console.log('[Telegram] Admin back');
    } else if (data === 'admin_close' || data === 'list_close') {
      if (config.BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cq.id, text: '✖ Fermé' }),
        });
        if (chatId && msgId) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/deleteMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, message_id: msgId }),
          });
        }
      }
      console.log('[Telegram] Message fermé');
    } else if (data.startsWith('list_filter_')) {
      if (!isAuthorizedChat(chatId)) {
        if (config.BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cq.id, text: '⛔ Accès refusé.', show_alert: true }),
          });
        }
      } else {
        const targetFilter = data.replace('list_filter_', '');
        const cur = (LIST_PAGES.get(chatId) || {}).page || 0;
        const { page: clampedPage } = await buildList(targetFilter, 0);
        const info = LIST_PAGES.get(chatId) || { fromAdmin: false };
        LIST_PAGES.set(chatId, { page: clampedPage, filter: targetFilter, fromAdmin: info.fromAdmin });
        if (config.BOT_TOKEN) {
          const label = targetFilter === 'premium' ? '💎 VIP' : targetFilter === 'ban' ? '🚫 Bloqués' : targetFilter === 'basic' ? '🟢 Basic' : '📋 Tous';
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cq.id, text: `${label}` }),
          });
          if (chatId && msgId) {
            await editListMessage(chatId, msgId, clampedPage, targetFilter);
          }
        }
        console.log(`[Telegram] List filter -> ${targetFilter}`);
      }
    } else if (data === 'list_prev' || data === 'list_next') {
      if (!isAuthorizedChat(chatId)) {
        if (config.BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cq.id, text: '⛔ Accès refusé.', show_alert: true }),
          });
        }
      } else {
        const cur = (LIST_PAGES.get(chatId) || {}).page || 0;
        const curFilter = (LIST_PAGES.get(chatId) || {}).filter || 'all';
        const requested = data === 'list_prev' ? cur - 1 : cur + 1;
        const { page: clampedPage } = await buildList(curFilter, requested);
        const info = LIST_PAGES.get(chatId) || { fromAdmin: false };
        LIST_PAGES.set(chatId, { page: clampedPage, filter: curFilter, fromAdmin: info.fromAdmin });
        if (config.BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cq.id, text: `Page ${clampedPage + 1}` }),
          });
          if (chatId && msgId) {
            await editListMessage(chatId, msgId, clampedPage, curFilter);
          }
        }
        console.log(`[Telegram] List nav -> page ${clampedPage} (${curFilter})`);
      }
    }
  }
}
