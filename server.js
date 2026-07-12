#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

// Load .env before anything else
const envPath = new URL('./.env', import.meta.url);
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    process.env[key] = val;
  }
}

// Dynamic import so .env is loaded first
import('./server/index.js');
