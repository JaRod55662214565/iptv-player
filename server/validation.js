import { config } from './config.js';

export function runBootValidation() {
  const checks = [
    { key: 'ADMIN_PASSWORD', value: config.ADMIN_PASSWORD, critical: true },
    { key: 'TELEGRAM_BOT_TOKEN', value: config.BOT_TOKEN, critical: true },
  ];
  if (config.STRIPE_ENABLED) {
    checks.push({ key: 'STRIPE_SECRET_KEY', value: config.STRIPE_SECRET_KEY, critical: true });
  }

  let hasError = false;
  for (const check of checks) {
    if (!check.value) {
      console.error(`[Boot] CRITICAL: ${check.key} is not defined!`);
      hasError = true;
    }
  }

  if (!config.ADMIN_PASSWORD || config.ADMIN_PASSWORD.length < 8) {
    console.error('[Boot] CRITICAL: ADMIN_PASSWORD must be at least 8 characters!');
    hasError = true;
  }

  if (hasError) process.exit(1);
}
