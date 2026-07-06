import { config, getStripe } from '../config.js';
import { state, savePremium } from '../state.js';
import { readJSON } from '../storage.js';
import { sendTelegram } from '../services/telegram.js';
import { escapeHTML, getClientIP } from '../lib/utils.js';

export async function handleStripeRoutes(pathname, req, res, body) {
  if (!pathname.startsWith('/api/stripe')) return false;

  if (pathname === '/api/stripe/checkout-session') {
    if (req.method !== 'POST') { res.writeHead(405); return res.end('Method not allowed'); }
    const stripe = getStripe();
    if (!stripe) { res.writeHead(500); return res.end(JSON.stringify({ error: 'Stripe not configured' })); }
    const data = JSON.parse(body || '{}');
    const clientIP = getClientIP(req);
    const origin = data.origin || config.SITE_URL;
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        client_reference_id: clientIP,
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Accès Premium Web TV',
              description: 'Accès à vie illimité aux chaînes de télévision et radios',
            },
            unit_amount: 499,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${origin}/#/?checkout=success`,
        cancel_url: `${origin}/#/?checkout=cancel`,
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ url: session.url }));
    } catch (err) {
      console.error('[Stripe Error]', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return true;
  }

  if (pathname === '/api/stripe/webhook') {
    if (req.method !== 'POST') { res.writeHead(405); return res.end('Method not allowed'); }
    const stripe = getStripe();
    if (!stripe) { res.writeHead(500); return res.end(JSON.stringify({ error: 'Stripe not configured' })); }
    const sig = req.headers['stripe-signature'];
    const whSecret = config.STRIPE_WEBHOOK_SECRET;
    if (!whSecret) {
      console.error('[Stripe] STRIPE_WEBHOOK_SECRET non defini');
      res.writeHead(500);
      return res.end('Webhook secret not configured');
    }
    try {
      const event = stripe.webhooks.constructEvent(body, sig, whSecret);
      if (event.type === 'checkout.session.completed') {
        const s = event.data.object;
        const clientIP = s.client_reference_id;
        if (clientIP) {
          const list = readJSON(config.PREMIUM_FILE);
          if (!list.find(p => p.ip === clientIP)) {
            list.push({ ip: clientIP, date: new Date().toISOString() });
            savePremium(list);
            await sendTelegram(`💎 <b>Premium activé via Stripe</b>\n📍 <b>IP:</b> <code>${escapeHTML(clientIP)}</code>`);
          }
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: true }));
    } catch (err) {
      console.error('[Stripe Webhook Error]', err.message);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return true;
  }

  return false;
}
