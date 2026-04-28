'use strict';

// ─────────────────────────────────────────────
//  CONFIGURATION SUPABASE
//  Remplace les valeurs ci-dessous par les tiennes
//  Supabase → Settings → API
// ─────────────────────────────────────────────
const SUPABASE_URL  = 'https://cmsciwujeoguivwdnacu.supabase.co';
const SUPABASE_ANON = 'sb_publishable_Ct_aNdUjcx2ON-moC0Suqg_Kgxf28m-';

// Client Supabase (chargé via CDN dans index.html)
let _sb = null;
function sb() {
  if (!_sb) _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  return _sb;
}

// ── Utilisateur courant ──────────────────────
let currentUser = null;
let currentProfile = null;

async function getSession() {
  const { data } = await sb().auth.getSession();
  return data.session;
}

// ── Écoute les changements d'auth ────────────
function onAuthChange(cb) {
  sb().auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      currentUser = session.user;
      currentProfile = await loadProfile(session.user.id);
    } else {
      currentUser = null;
      currentProfile = null;
    }
    cb(event, session, currentProfile);
  });
}

// ── Inscription pseudo/MDP ───────────────────
async function signUp(email, password, username) {
  // Vérifie que le pseudo n'est pas pris
  const { data: existing } = await sb()
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (existing) throw new Error('Ce pseudo est déjà pris.');

  const { data, error } = await sb().auth.signUp({
    email,
    password,
    options: { data: { username } }
  });
  if (error) throw error;
  return data;
}

// ── Connexion pseudo/MDP ─────────────────────
async function signIn(email, password) {
  const { data, error } = await sb().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// ── Connexion Google ─────────────────────────
async function signInWithGoogle() {
  const { error } = await sb().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  });
  if (error) throw error;
}

// ── Déconnexion ──────────────────────────────
async function signOut() {
  await sb().auth.signOut();
  currentUser = null;
  currentProfile = null;
}

// ── Charger le profil ────────────────────────
async function loadProfile(userId) {
  const { data, error } = await sb()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data;
}

// ── Sauvegarder le profil ────────────────────
async function saveProfile(updates) {
  if (!currentUser) return;
  const { error } = await sb()
    .from('profiles')
    .update(updates)
    .eq('id', currentUser.id);
  if (error) console.error('Save error:', error.message);
}

// ── Charger le leaderboard ───────────────────
async function fetchLeaderboard() {
  const { data, error } = await sb()
    .from('leaderboard')
    .select('username, best_score, rank')
    .order('rank');
  if (error) return [];
  return data;
}

// ── Vérifier si pseudo dispo (live) ──────────
async function checkUsername(username) {
  if (username.length < 3) return false;
  const { data } = await sb()
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  return !data;
}

window.Auth = {
  sb, getSession, onAuthChange,
  signUp, signIn, signInWithGoogle, signOut,
  loadProfile, saveProfile, fetchLeaderboard, checkUsername,
  get user() { return currentUser; },
  get profile() { return currentProfile; },
};
