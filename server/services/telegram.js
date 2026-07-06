import { config } from '../config.js';
import { state, saveBans, saveWhitelist, savePremium } from '../state.js';
import { readJSON } from '../storage.js';
import { escapeHTML } from '../lib/utils.js';

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
    if (!resp.ok) console.error('[Telegram] Erreur:', await resp.text());
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
    console.error('[Telegram] Webhook registration error:', e.message);
  }

  try {
    await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: 'Afficher les commandes disponibles' },
          { command: 'help', description: 'Afficher les commandes disponibles' },
          { command: 'ip', description: 'Interroger une IP (ex: /ip 1.2.3.4)' },
          { command: 'list', description: 'Lister les IPs bloquées, whitelistées et premium' },
        ],
      }),
    });
    console.log('[Telegram] Bot commands registered');
  } catch (e) {
    console.error('[Telegram] Bot commands registration error:', e.message);
  }
}

export async function handleTelegramWebhook(update) {
  if (update.message && update.message.text) {
    const chatId = update.message.chat.id;
    const cmd = update.message.text.trim();

    if (cmd === '/start' || cmd === '/help') {
      const msg = [
        `🤖 <b>WebTV Bot</b> — Commandes disponibles :`,
        ``,
        `🔍 <code>/ip &lt;adresse&gt;</code> — Interroger une IP`,
        `   Ex: <code>/ip 52.16.245.145</code>`,
        `📋 <code>/list</code> — Voir les IPs bloquées, whitelistées et premium`,
        ``,
        `📢 Les boutons inline sur les notifications permettent de :`,
        `   • 🔓 Débloquer une IP`,
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
          visit ? `🌍 <b>Pays:</b> ${visit.country || 'Inconnu'} ${visit.countryCode || ''}` : null,
          visit ? `📡 <b>ISP:</b> ${visit.isp || 'Inconnu'}` : null,
          visit ? `📱 <b>Appareil:</b> ${visit.deviceType || 'Inconnu'} — ${visit.browser || '?'} ${visit.os || ''}` : null,
          visit ? `📺 <b>Chaîne:</b> ${visit.channelName || 'Aucune'}` : null,
          visit ? `🗺️ <a href="${mapsLink}">Voir sur Google Maps</a>` : null,
        ].filter(Boolean).join('\n');

        const buttons = [];
        if (isBanned) buttons.push({ text: '🔓 Débloquer', callback_data: `unban_${ip}` });
        buttons.push({ text: '🔐 Panel', url: `${config.SITE_URL}/panel` });
        if (!isPremium) buttons.push({ text: '💎 Premium', callback_data: `premium_${ip}` });

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
      const bans = readJSON(config.BANS_FILE);
      const whitelist = readJSON(config.WHITELIST_FILE);
      const premiums = readJSON(config.PREMIUM_FILE);

      const banLines = bans.length > 0
        ? bans.slice(0, 20).map(b => `🚫 <code>${escapeHTML(b.ip)}</code>${b.reason ? ` — ${escapeHTML(b.reason)}` : ''}`).join('\n')
        : 'Aucun IP bloqué.';
      const whitelistLines = whitelist.length > 0
        ? whitelist.slice(0, 20).map(ip => `✅ <code>${escapeHTML(ip)}</code>`).join('\n')
        : 'Aucun IP whitelisté.';
      const premiumLines = premiums.length > 0
        ? premiums.slice(0, 20).map(p => `💎 <code>${escapeHTML(p.ip)}</code> (${new Date(p.date).toLocaleDateString()})`).join('\n')
        : 'Aucun IP premium.';

      const msg = [
        `📋 <b>Liste des IPs</b>`,
        ``,
        `🚫 <b>Bloqués (${bans.length})</b> :`,
        banLines,
        bans.length > 20 ? `... et ${bans.length - 20} de plus` : '',
        ``,
        `✅ <b>Whitelistés (${whitelist.length})</b> :`,
        whitelistLines,
        whitelist.length > 20 ? `... et ${whitelist.length - 20} de plus` : '',
        ``,
        `💎 <b>Premium (${premiums.length})</b> :`,
        premiumLines,
        premiums.length > 20 ? `... et ${premiums.length - 20} de plus` : '',
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
    }
  }
}
