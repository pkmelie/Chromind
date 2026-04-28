'use strict';

// ═══════════════════════════════════════════
//  CONFIG — remplace par tes vraies valeurs
//  Supabase Dashboard → Settings → API
// ═══════════════════════════════════════════
const SUPA_URL  = 'https://XXXXXXXXXXXX.supabase.co';
const SUPA_KEY  = 'eyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

// ── Supabase client léger (sans npm) ──
const supa = {
  _h() {
    return {
      'Content-Type': 'application/json',
      'apikey': SUPA_KEY,
      'Authorization': 'Bearer ' + (Auth.token || SUPA_KEY),
    };
  },
  async from(table) {
    return {
      _table: table,
      async select(cols = '*', filters = '') {
        const r = await fetch(`${SUPA_URL}/rest/v1/${table}?select=${cols}${filters}`, { headers: supa._h() });
        return r.json();
      },
      async upsert(data) {
        const r = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
          method: 'POST',
          headers: { ...supa._h(), 'Prefer': 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify(data),
        });
        return r.json();
      },
      async update(data, filters = '') {
        const r = await fetch(`${SUPA_URL}/rest/v1/${table}?${filters}`, {
          method: 'PATCH',
          headers: { ...supa._h(), 'Prefer': 'return=representation' },
          body: JSON.stringify(data),
        });
        return r.json();
      },
    };
  },
  async rpc(fn, params = {}) {
    const r = await fetch(`${SUPA_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: supa._h(),
      body: JSON.stringify(params),
    });
    return r.json();
  },
};

// ── Auth ──
const Auth = {
  token: null,
  user: null,
  username: null,

  async signUp(username, email, password) {
    const r = await fetch(`${SUPA_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPA_KEY },
      body: JSON.stringify({ email, password }),
    });
    const d = await r.json();
    if (d.error) throw new Error(d.error.message || d.msg || 'Erreur inscription');
    this.token = d.access_token;
    this.user  = d.user;
    // Crée le profil avec le pseudo
    await this._createProfile(d.user.id, username);
    return d;
  },

  async signIn(email, password) {
    const r = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPA_KEY },
      body: JSON.stringify({ email, password }),
    });
    const d = await r.json();
    if (d.error) throw new Error(d.error.message || 'Email ou mot de passe incorrect');
    this.token = d.access_token;
    this.user  = d.user;
    localStorage.setItem('cm_token', d.access_token);
    localStorage.setItem('cm_refresh', d.refresh_token);
    await this._loadProfile();
    return d;
  },

  async signInWithGoogle() {
    const redirectTo = encodeURIComponent(window.location.origin + '/auth-callback.html');
    window.location.href = `${SUPA_URL}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`;
  },

  async handleOAuthCallback(accessToken, refreshToken) {
    this.token = accessToken;
    localStorage.setItem('cm_token', accessToken);
    localStorage.setItem('cm_refresh', refreshToken);
    // Récupère infos user
    const r = await fetch(`${SUPA_URL}/auth/v1/user`, {
      headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + accessToken }
    });
    const u = await r.json();
    this.user = u;
    // Crée profil si premier login Google (pseudo = partie avant @)
    const exists = await this._profileExists(u.id);
    if (!exists) {
      const pseudo = (u.email || 'joueur').split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
      await this._createProfile(u.id, pseudo);
    }
    await this._loadProfile();
  },

  async restoreSession() {
    const token = localStorage.getItem('cm_token');
    if (!token) return false;
    try {
      const r = await fetch(`${SUPA_URL}/auth/v1/user`, {
        headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + token }
      });
      if (!r.ok) {
        // Tente refresh
        return await this._refreshSession();
      }
      this.token = token;
      this.user = await r.json();
      await this._loadProfile();
      return true;
    } catch(e) { return false; }
  },

  async _refreshSession() {
    const refresh = localStorage.getItem('cm_refresh');
    if (!refresh) return false;
    try {
      const r = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPA_KEY },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      const d = await r.json();
      if (d.error) { this.signOut(); return false; }
      this.token = d.access_token;
      this.user = d.user;
      localStorage.setItem('cm_token', d.access_token);
      localStorage.setItem('cm_refresh', d.refresh_token);
      await this._loadProfile();
      return true;
    } catch(e) { return false; }
  },

  async _createProfile(uid, username) {
    await fetch(`${SUPA_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: { ...supa._h(), 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ id: uid, username }),
    });
    this.username = username;
    // Init save
    await fetch(`${SUPA_URL}/rest/v1/game_saves`, {
      method: 'POST',
      headers: { ...supa._h(), 'Prefer': 'resolution=ignore-duplicates' },
      body: JSON.stringify({ user_id: uid }),
    });
  },

  async _profileExists(uid) {
    const r = await fetch(`${SUPA_URL}/rest/v1/profiles?id=eq.${uid}&select=id`, { headers: supa._h() });
    const d = await r.json();
    return Array.isArray(d) && d.length > 0;
  },

  async _loadProfile() {
    if (!this.user) return;
    const r = await fetch(`${SUPA_URL}/rest/v1/profiles?id=eq.${this.user.id}&select=username`, { headers: supa._h() });
    const d = await r.json();
    if (d && d[0]) this.username = d[0].username;
  },

  signOut() {
    this.token = null; this.user = null; this.username = null;
    localStorage.removeItem('cm_token');
    localStorage.removeItem('cm_refresh');
  },

  isLoggedIn() { return !!this.token && !!this.user; },
};

// ── Cloud Save ──
const CloudSave = {
  async push(state) {
    if (!Auth.isLoggedIn()) return;
    try {
      await fetch(`${SUPA_URL}/rest/v1/game_saves?user_id=eq.${Auth.user.id}`, {
        method: 'PATCH',
        headers: { ...supa._h(), 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          coins:       state.coins,
          best:        state.best,
          games:       state.games,
          streak:      state.streak,
          owned_skins: [...state.owned],
          equipped:    state.equipped,
          updated_at:  new Date().toISOString(),
        }),
      });
    } catch(e) { console.warn('Cloud save failed:', e); }
  },

  async pull() {
    if (!Auth.isLoggedIn()) return null;
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/game_saves?user_id=eq.${Auth.user.id}&select=*`, { headers: supa._h() });
      const d = await r.json();
      if (!d || !d[0]) return null;
      const s = d[0];
      return {
        coins:   s.coins   || 0,
        best:    s.best    || 0,
        games:   s.games   || 0,
        streak:  s.streak  || 0,
        owned:   new Set(s.owned_skins || ['classic']),
        equipped: s.equipped || 'classic',
      };
    } catch(e) { return null; }
  },

  async leaderboard() {
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/leaderboard?select=username,best,games`, { headers: supa._h() });
      return await r.json();
    } catch(e) { return []; }
  },
};

window.Auth = Auth;
window.CloudSave = CloudSave;
