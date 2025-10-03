// api/_db.js
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.warn('Supabase env vars missing. Signup/Login will fail until set.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function getUserByNameRole(name, role) {
  const n = String(name || '').trim().toLowerCase();
  const r = role === 'teacher' ? 'teacher' : 'student';
  // unique(lower(name), role)
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', r)
    .ilike('name', n)  // case-insensitive; ilike exact not guaranteed, so:
    .limit(50);
  if (error) throw error;
  // filter exact lower(name)
  const row = (data || []).find(x => x.name && x.name.toLowerCase() === n);
  return row || null;
}

async function createUser(name, role, pin) {
  const n = String(name || '').trim();
  const r = role === 'teacher' ? 'teacher' : 'student';
  const p = String(pin || '').trim();
  if (!n || !p) throw new Error('Missing name or pin');

  const hash = await bcrypt.hash(p, 10);
  const { data, error } = await supabase
    .from('users')
    .insert({ name: n, role: r, pin_hash: hash })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function verifyUser(name, role, pin) {
  const row = await getUserByNameRole(name, role);
  if (!row) return null;
  const ok = await bcrypt.compare(String(pin || ''), row.pin_hash || '');
  return ok ? row : null;
}

module.exports = { supabase, createUser, verifyUser, getUserByNameRole };
