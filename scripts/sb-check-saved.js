// scripts/sb-check-saved.js
// Diagnostic: run the same nested query used by app/shots-guardados/page.tsx
const fs = require('fs');
const path = require('path');
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
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(2);
}
const supabase = createClient(url, key);

async function run() {
  try {
    const result = await supabase
      .from('saved_shots')
      .select(`
        id,
        shot_id,
        created_at,
        shots (
          id,
          title,
          description,
          image_url,
          created_at,
          users (
            email
          )
        )
      `)
      .limit(2);

    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error running saved_shots query:', err);
  }
}

run();
