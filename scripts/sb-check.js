// scripts/sb-check.js
// Simple diagnostic script to check Supabase connectivity using local env vars.
const fs = require('fs');
const path = require('path');

// Load .env.local if present (simple parser)
const envPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, 'utf8');
  raw.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    // Remove optional surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  });
}

const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment or .env.local');
  process.exit(2);
}

const supabase = createClient(url, key);

async function run() {
  try {
    const { data, error, status } = await supabase
      .from('shots')
      .select('id, title')
      .limit(1);

    console.log('Status:', status);
    console.log('Error:', error);
    console.log('Data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Unexpected error running diagnostic:', err);
    process.exit(1);
  }
}

run();
