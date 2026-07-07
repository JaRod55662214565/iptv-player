export function runBootValidation() {
  const checks = [
    { key: 'ADMIN_PASSWORD', value: process.env.ADMIN_PASSWORD, critical: true },
    { key: 'STRIPE_SECRET_KEY', value: process.env.STRIPE_SECRET_KEY, critical: true },
    { key: 'TELEGRAM_BOT_TOKEN', value: process.env.TELEGRAM_BOT_TOKEN, critical: true },
  ];

  let hasError = false;
  for (const check of checks) {
    if (!check.value) {
      console.error(`CRITICAL ERROR: ${check.key} environment variable is not defined!`);
      hasError = true;
    }
  }

  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 8) {
    console.error('CRITICAL ERROR: ADMIN_PASSWORD must be at least 8 characters!');
    hasError = true;
  }

  if (hasError) process.exit(1);
}
