import { config } from '../config.js';
import { state, saveBans, saveWhitelist, savePremium, loadBans, loadPremium } from '../state.js';
import { readJSON } from '../storage.js';
import { escapeHTML } from '../lib/utils.js';

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
    const c = v.countryCode || '??';
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

export async function sendTelegram(text, ip) {
  if (!config.BOT_TOKEN || !config.CHAT_ID) return;
  if (text.length > 3900) text = text.slice(0, 3900) + '\n\n... (tronqué)';
  try {
    const reply_markup = {
      inline_keyboard: [[], []]
    };
    const row1 = [];
    if (ip) {
      row1.push({ text: '🔓 Debloquer', callback_data: `unban_${ip}` });
      row1.push({ text: '💎 Premium', callback_data: `premium_${ip}` });
    }
    row1.push({ text: '🔐 Panel', url: `${config.SITE_URL}/panel` });
    reply_markup.inline_keyboard[0] = row1;

    const row2 = [{ text: '📢 Push Ad', callback_data: 'push_ad' }];
    reply_markup.inline_keyboard[1] = row2;

    const resp = await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup,
      }),
    });
    if (!resp.ok) console.error('[Telegram] Erreur envoi (details masques pour securite)');
    else console.log('[Telegram] Notification envoyee');
  } catch (e) {
    console.error('[Telegram] Erreur:', e.message);
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
      console.error('[Telegram] Webhook registration failed:', data);
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
          { command: 'ip', description: 'Interroger une IP (ex: /ip 1.2.3.4)' },
          { command: 'list', description: 'Lister les IPs Basic, VIP et bloquées' },
        ],
      }),
    });
    console.log('[Telegram] Bot commands registered');
  } catch (e) {
    console.error('[Telegram] Bot commands registration error (token masque pour securite)');
  }
}

function isAuthorizedChat(chatId) {
  return String(chatId) === String(config.CHAT_ID);
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
        `🔍 <code>/ip &lt;adresse&gt;</code> — Interroger une IP`,
        `   Ex: <code>/ip 52.16.245.145</code>`,
        `🛠️ <code>/admin</code> — Menu administration avec actions rapides`,
        ``,
        `📢 Les boutons inline sur les notifications permettent de :`,
        `   • ⛔ Bloquer / 🔓 Débloquer une IP`,
        `   • 💎 Passer une IP en Premium`,
        `   • 📢 Push une pub à tous les visiteurs`,
        `   • 🔐 Accéder au panel admin`,
      ].join('\n');
      if (config.BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' }),
        });
      }
      console.log('[Telegram] /start ou /help');

    } else if (cmd.startsWith('/ip')) {
      const ip = cmd.length > 4 ? cmd.slice(4).trim() : '';
      if (!ip || !/^[\da-f:.]+$/i.test(ip)) {
        if (config.BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: `⚠️ Usage: <code>/ip &lt;adresse&gt;</code>\nEx: <code>/ip 52.16.245.145</code>`, parse_mode: 'HTML' }),
          });
        }
        console.log(`[Telegram] /ip usage invalide: "${cmd}"`);
      } else if (!isAuthorizedChat(chatId)) {
        if (config.BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: `⛔ Accès refusé.`, parse_mode: 'HTML' }),
          });
        }
      } else {
        const visit = state.VISITS.find(v => v.ip === ip);
        const isBanned = state.BANS_LOOKUP.has(ip);
        const isPremium = state.PREMIUM_LOOKUP.has(ip);
        const isWhitelisted = state.WHITELIST_LOOKUP.has(ip);

        const cityParts = [];
        if (visit?.city) cityParts.push(visit.city);
        if (visit?.region) cityParts.push(visit.region);
        const cityStr = cityParts.length > 0 ? cityParts.join(', ') : null;

        const mapsQ = encodeURIComponent([visit?.city, visit?.region, visit?.country].filter(Boolean).join(', ') || ip);
        const mapsLink = `https://www.google.com/maps/search/?api=1&query=${mapsQ}`;

        const lines = [
          `🔍 <b>IP Lookup:</b> <code>${escapeHTML(ip)}</code>`,
          isBanned ? '🚫 <b>Statut:</b> Banni' : isPremium ? '💎 <b>Statut:</b> Premium' : isWhitelisted ? '✅ <b>Statut:</b> Whitelisté' : '🟢 <b>Statut:</b> Normal',
          visit ? `📅 <b>Dernière visite:</b> ${new Date(visit.timestamp).toLocaleString()}` : '📅 <b>Dernière visite:</b> Aucune',
          visit && cityStr ? `🏙️ <b>Ville:</b> ${escapeHTML(cityStr)}` : null,
          visit ? `🌍 <b>Pays:</b> ${escapeHTML(visit.country || 'Inconnu')} ${escapeHTML(visit.countryCode || '')}` : null,
          visit ? `📡 <b>ISP:</b> ${visit.isp || 'Inconnu'}` : null,
          visit ? `📱 <b>Appareil:</b> ${visit.deviceType || 'Inconnu'} — ${visit.browser || '?'} ${visit.os || ''}` : null,
          visit ? `📺 <b>Chaîne:</b> ${escapeHTML(visit.channelName || 'Aucune')}` : null,
          visit ? `🗺️ <a href="${mapsLink}">Voir sur Google Maps</a>` : null,
        ].filter(Boolean).join('\n');

        const buttons = [];
        if (isBanned) {
          buttons.push({ text: '🔓 Débloquer', callback_data: `unban_${ip}` });
        } else {
          buttons.push({ text: '⛔ Bloquer', callback_data: `block_${ip}` });
        }
        buttons.push({ text: '🔐 Panel', url: `${config.SITE_URL}/panel` });
        if (isPremium) {
          buttons.push({ text: '🔻 Retirer Premium', callback_data: `unpremium_${ip}` });
        } else {
          buttons.push({ text: '💎 Premium', callback_data: `premium_${ip}` });
        }

        if (config.BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId, text: lines, parse_mode: 'HTML',
              disable_web_page_preview: true,
              reply_markup: { inline_keyboard: [buttons] },
            }),
          });
        }
        console.log(`[Telegram] /ip lookup: ${ip}`);
      }
    } else if (cmd === '/list') {
      if (!isAuthorizedChat(chatId)) {
        if (config.BOT_TOKEN) { await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: `⛔ Accès refusé.`, parse_mode: 'HTML' }) }); }
      } else {
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

      const premiumLines = premiums.length > 0
        ? premiums.slice(0, 15).map(p => `💎 <code>${escapeHTML(p.ip)}</code> (${new Date(p.date).toLocaleDateString()})`).join('\n')
        : 'Aucun.';

      const banLines = bans.length > 0
        ? bans.slice(0, 15).map(b => `🚫 <code>${escapeHTML(b.ip)}</code>${b.reason ? ` — ${escapeHTML(b.reason)}` : ''}`).join('\n')
        : 'Aucun.';

      const basicLines = basicIPs.length > 0
        ? basicIPs.slice(0, 15).map(v => `🟢 <code>${escapeHTML(v.ip)}</code> (${v.country || '?'})`).join('\n')
        : 'Aucun.';

      const msg = [
        `📋 <b>Liste des IPs</b>`,
        ``,
        `💎 <b>VIP — Premium (${premiums.length})</b>`,
        premiumLines,
        premiums.length > 15 ? `... et ${premiums.length - 15} de plus` : '',
        ``,
        `🚫 <b>Bloqués (${bans.length})</b>`,
        banLines,
        bans.length > 15 ? `... et ${bans.length - 15} de plus` : '',
        ``,
        `🟢 <b>Basic — Visiteurs (${basicIPs.length})</b>`,
        basicLines,
        basicIPs.length > 15 ? `... et ${basicIPs.length - 15} de plus` : '',
        ``,
        `━━━━━━━━━━━━━`,
        `📊 <b>Résumé</b>`,
        `💎 VIP: ${premiums.length}  🚫 Bloqués: ${bans.length}  🟢 Basic: ${basicIPs.length}`,
      ].filter(Boolean).join('\n');
      const truncated = msg.length > 4000 ? msg.slice(0, 4000) + '\n\n... (tronqué)' : msg;

      if (config.BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: truncated, parse_mode: 'HTML' }),
        });
      }
      console.log('[Telegram] /list');
      }

    } else if (cmd === '/stats') {
      if (!isAuthorizedChat(chatId)) {
        if (config.BOT_TOKEN) { await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: `⛔ Accès refusé.`, parse_mode: 'HTML' }) }); }
      } else {
      const s = computeStats();
      const browsers = s.topBrowsers.map(([name, count]) => `  • ${name}: ${count}`).join('\n');
      const oses = s.topOS.map(([name, count]) => `  • ${name}: ${count}`).join('\n');
      const countries = s.topCountries.map(([cc, count]) => `  • ${cc}: ${count}`).join('\n');
      const channels = s.topChannels.map(([name, count]) => `  • ${escapeHTML(name)}: ${count}`).join('\n');
      const referrers = s.topReferrers.map(([name, count]) => `  • ${escapeHTML(name)}: ${count}`).join('\n');

      const msg = [
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
        s.topBrowsers.length ? `\n🌐 <b>Navigateurs</b>\n${browsers}` : '',
        s.topOS.length ? `\n💿 <b>Systèmes</b>\n${oses}` : '',
        s.topCountries.length ? `\n🌍 <b>Pays</b>\n${countries}` : '',
        s.topChannels.length ? `\n📺 <b>Chaînes les + regardées</b>\n${channels}` : '',
        s.topReferrers.length ? `\n🔗 <b>D'où ils viennent</b>\n${referrers}` : '',
        ``,
        `🔒 <b>Modération</b>`,
        `  • Bannis: <b>${s.bans}</b>`,
        `  • Premium: <b>${s.premiums}</b>`,
        `  • Whitelistés: <b>${s.whitelisted}</b>`,
        ``,
        `📢 <b>Publicités</b>`,
        `  • Total: <b>${s.adsTotal}</b>`,
        `  • Aujourd'hui: <b>${s.adsToday}</b>`,
      ].filter(Boolean).join('\n');

      if (config.BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML', disable_web_page_preview: true }),
        });
      }
      console.log('[Telegram] /stats');
      }

    } else if (cmd === '/admin') {
      if (!isAuthorizedChat(chatId)) {
        if (config.BOT_TOKEN) { await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: `⛔ Accès refusé.`, parse_mode: 'HTML' }) }); }
      } else {
      const s = computeStats();
      const msg = [
        `🛠️ <b>Admin Panel — Actions rapides</b>`,
        ``,
        `👥 Visites: <b>${s.totalVisits}</b> | IP: <b>${s.uniqueIPs}</b>`,
        `🔒 Bannis: <b>${s.bans}</b> | 💎 Premium: <b>${s.premiums}</b>`,
        `📢 Pubs: <b>${s.adsToday}</b> aujourd'hui / <b>${s.adsTotal}</b> total`,
      ].join('\n');

      const keyboard = [
        [
          { text: '📊 Stats', callback_data: 'admin_stats' },
          { text: '📋 Liste IPs', callback_data: 'admin_list' },
        ],
        [
          { text: '📢 Push Ad', callback_data: 'push_ad' },
          { text: '🔐 Panel Web', url: `${config.SITE_URL}/panel` },
        ],
        [
          { text: '🔄 Rafraîchir', callback_data: 'admin_refresh' },
        ],
      ];

      if (config.BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, text: msg, parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard },
          }),
        });
      }
      console.log('[Telegram] /admin');
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
    console.log(`[Telegram] Callback recu: ${data}`);
    if (data.startsWith('unban_')) {
      const ip = data.slice(6);
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
              text: `✅ <b>DEBLOQUE &amp; AUTORISE</b>\n\nIP: <code>${ip}</code>`,
              parse_mode: 'HTML',
            }),
          });
        }
      }
      console.log(`[Telegram] Unban & Whitelist via callback: ${ip}`);
    } else if (data.startsWith('block_')) {
      const ip = data.slice(6);
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
              text: `🚫 <b>BLOQUÉ</b>\n\nIP: <code>${ip}</code>`,
              parse_mode: 'HTML',
            }),
          });
        }
      }
      console.log(`[Telegram] Block via callback: ${ip}`);
    } else if (data.startsWith('premium_')) {
      const ip = data.slice(8);
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
              text: `💎 <b>Premium Activé</b>\n\nIP: <code>${ip}</code>`,
              parse_mode: 'HTML',
            }),
          });
        }
      }
      console.log(`[Telegram] Premium via callback: ${ip}`);
    } else if (data.startsWith('unpremium_')) {
      const ip = data.slice(10);
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
              text: `🔻 <b>Premium Retiré</b>\n\nIP: <code>${ip}</code>`,
              parse_mode: 'HTML',
            }),
          });
        }
      }
      console.log(`[Telegram] Unpremium via callback: ${ip}`);
    } else if (data === 'push_ad') {
      state.PENDING_AD_PUSH = Date.now();
      if (config.BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cq.id, text: '📢 Pub pushée à tous les visiteurs !', show_alert: true }),
        });
      }
      console.log('[Telegram] Push ad via callback');
    } else if (data === 'admin_stats') {
      const s = computeStats();
      const browsers = s.topBrowsers.map(([name, count]) => `  • ${name}: ${count}`).join('\n');
      const oses = s.topOS.map(([name, count]) => `  • ${name}: ${count}`).join('\n');
      const countries = s.topCountries.map(([cc, count]) => `  • ${cc}: ${count}`).join('\n');
      const channels = s.topChannels.map(([name, count]) => `  • ${escapeHTML(name)}: ${count}`).join('\n');
      const referrers = s.topReferrers.map(([name, count]) => `  • ${escapeHTML(name)}: ${count}`).join('\n');

      const msg = [
        `📊 <b>Statistiques WebTV</b>`,
        ``,
        `👥 <b>Visites</b>`,
        `  • Total: <b>${s.totalVisits}</b>`,
        `  • IP uniques: <b>${s.uniqueIPs}</b>`,
        `  • Datacenters: ${s.datacenterCount}`,
        `  • Proxys: ${s.proxyCount}`,
        s.topBrowsers.length ? `\n🌐 <b>Navigateurs</b>\n${browsers}` : '',
        s.topOS.length ? `\n💿 <b>Systèmes</b>\n${oses}` : '',
        s.topCountries.length ? `\n🌍 <b>Pays</b>\n${countries}` : '',
        s.topChannels.length ? `\n📺 <b>Chaînes les + regardées</b>\n${channels}` : '',
        s.topReferrers.length ? `\n🔗 <b>D'où ils viennent</b>\n${referrers}` : '',
        ``,
        `🔒 <b>Modération</b>`,
        `  • Bannis: <b>${s.bans}</b>`,
        `  • Premium: <b>${s.premiums}</b>`,
        `  • Whitelistés: <b>${s.whitelisted}</b>`,
        ``,
        `📢 <b>Publicités</b>`,
        `  • Total: <b>${s.adsTotal}</b>`,
        `  • Aujourd'hui: <b>${s.adsToday}</b>`,
      ].filter(Boolean).join('\n');

      if (config.BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cq.id, text: '📊 Statistiques générées' }),
        });
        if (chatId) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML', disable_web_page_preview: true }),
          });
        }
      }
      console.log('[Telegram] Admin stats');

    } else if (data === 'admin_list') {
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

      const premiumLines = premiums.length > 0
        ? premiums.slice(0, 15).map(p => `💎 <code>${escapeHTML(p.ip)}</code> (${new Date(p.date).toLocaleDateString()})`).join('\n')
        : 'Aucun.';

      const banLines = bans.length > 0
        ? bans.slice(0, 15).map(b => `🚫 <code>${escapeHTML(b.ip)}</code>${b.reason ? ` — ${escapeHTML(b.reason)}` : ''}`).join('\n')
        : 'Aucun.';

      const basicLines = basicIPs.length > 0
        ? basicIPs.slice(0, 15).map(v => `🟢 <code>${escapeHTML(v.ip)}</code> (${v.country || '?'})`).join('\n')
        : 'Aucun.';

      const msg = [
        `📋 <b>Liste des IPs</b>`,
        ``,
        `💎 <b>VIP — Premium (${premiums.length})</b>`,
        premiumLines,
        premiums.length > 15 ? `... et ${premiums.length - 15} de plus` : '',
        ``,
        `🚫 <b>Bloqués (${bans.length})</b>`,
        banLines,
        bans.length > 15 ? `... et ${bans.length - 15} de plus` : '',
        ``,
        `🟢 <b>Basic — Visiteurs (${basicIPs.length})</b>`,
        basicLines,
        basicIPs.length > 15 ? `... et ${basicIPs.length - 15} de plus` : '',
        ``,
        `━━━━━━━━━━━━━`,
        `📊 <b>Résumé</b>`,
        `💎 VIP: ${premiums.length}  🚫 Bloqués: ${bans.length}  🟢 Basic: ${basicIPs.length}`,
      ].filter(Boolean).join('\n');
      const truncated = msg.length > 4000 ? msg.slice(0, 4000) + '\n\n... (tronqué)' : msg;

      if (config.BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cq.id, text: '📋 Liste générée' }),
        });
        if (chatId) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: truncated, parse_mode: 'HTML' }),
          });
        }
      }
      console.log('[Telegram] Admin list');

    } else if (data === 'admin_refresh') {
      loadBans();
      loadPremium();
      const s = computeStats();
      const updatedMsg = [
        `🛠️ <b>Admin Panel — Actions rapides</b>`,
        ``,
        `✅ Données rafraîchies.`,
        `👥 Visites: <b>${s.totalVisits}</b> | IP: <b>${s.uniqueIPs}</b>`,
        `🔒 Bannis: <b>${s.bans}</b> | 💎 Premium: <b>${s.premiums}</b>`,
        `📢 Pubs: <b>${s.adsToday}</b> aujourd'hui / <b>${s.adsTotal}</b> total`,
      ].join('\n');

      if (config.BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cq.id, text: '✅ Données rafraîchies' }),
        });
        if (chatId && msgId) {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId, message_id: msgId,
              text: updatedMsg, parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '📊 Stats', callback_data: 'admin_stats' },
                    { text: '📋 Liste IPs', callback_data: 'admin_list' },
                  ],
                  [
                    { text: '📢 Push Ad', callback_data: 'push_ad' },
                    { text: '🔐 Panel Web', url: `${config.SITE_URL}/panel` },
                  ],
                  [
                    { text: '🔄 Rafraîchir', callback_data: 'admin_refresh' },
                  ],
                ],
              },
            }),
          });
        }
      }
      console.log('[Telegram] Admin refresh');
    }
  }
}
