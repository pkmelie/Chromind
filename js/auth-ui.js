'use strict';

let usernameTimer = null;

const AuthUI = {
  showLanding() { show('auth-landing'); },
  showLogin()   { show('auth-login');    document.getElementById('login-error').textContent = ''; },
  showRegister(){ show('auth-register'); document.getElementById('reg-error').textContent = ''; },

  async doLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pwd   = document.getElementById('login-pwd').value;
    const errEl = document.getElementById('login-error');
    const btn   = document.getElementById('login-btn');
    errEl.textContent = '';
    if (!email || !pwd) { errEl.textContent = 'Remplis tous les champs.'; return; }
    btn.textContent = 'Connexion…'; btn.disabled = true;
    try {
      await Auth.signIn(email, pwd);
    } catch(e) {
      errEl.textContent = translateError(e.message);
    }
    btn.textContent = 'Se connecter'; btn.disabled = false;
  },

  async doRegister() {
    const username = document.getElementById('reg-username').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const pwd      = document.getElementById('reg-pwd').value;
    const errEl    = document.getElementById('reg-error');
    const btn      = document.getElementById('reg-btn');
    errEl.textContent = ''; errEl.style.color = '#ff2d55';

    if (!username || !email || !pwd) { errEl.textContent = 'Remplis tous les champs.'; return; }
    if (username.length < 3)         { errEl.textContent = 'Pseudo trop court (3 min).'; return; }
    if (pwd.length < 8)              { errEl.textContent = 'Mot de passe trop court (8 min).'; return; }

    btn.textContent = 'Création…'; btn.disabled = true;
    try {
      await Auth.signUp(email, pwd, username);
      errEl.style.color = '#30d158';
      errEl.textContent = 'Compte créé ! Vérifie ton email.';
    } catch(e) {
      errEl.style.color = '#ff2d55';
      errEl.textContent = translateError(e.message);
    }
    btn.textContent = 'Créer mon compte'; btn.disabled = false;
  },

  checkUsernameAvail(val) {
    const el = document.getElementById('username-check');
    clearTimeout(usernameTimer);
    if (val.length < 3) { el.textContent = ''; return; }
    el.textContent = '…';
    usernameTimer = setTimeout(async () => {
      try {
        const ok = await Auth.checkUsername(val);
        el.textContent = ok ? '✓' : '✗';
        el.style.color  = ok ? '#30d158' : '#ff2d55';
      } catch(e) { el.textContent = ''; }
    }, 500);
  },

  async doLogout() {
    await Auth.signOut();
    show('auth-landing');
  },
};

function translateError(msg) {
  if (msg.includes('Invalid login'))      return 'Email ou mot de passe incorrect.';
  if (msg.includes('already registered')) return 'Cet email est déjà utilisé.';
  if (msg.includes('Password should'))    return 'Mot de passe trop court (8 min).';
  if (msg.includes('valid email'))        return 'Email invalide.';
  if (msg.includes('Ce pseudo'))          return msg;
  return 'Erreur : ' + msg;
}

// ── Écoute les changements d'auth ──
Auth.onAuthChange(async (event, session, profile) => {
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    if (profile) {
      state.coins      = profile.coins;
      state.best       = profile.best_score;
      state.games      = profile.games;
      state.streak     = profile.streak;
      state.deathCount = profile.death_count;
      state.owned      = new Set(profile.owned_skins);
      state.equipped   = profile.equipped;
      document.getElementById('hm-username-btn').textContent = profile.username;
      App.showHome();
    }
  } else if (event === 'SIGNED_OUT') {
    show('auth-landing');
  }
});

// ── Init au démarrage — TOUJOURS sortir du loading ──
(async () => {
  show('loading');
  try {
    const session = await Auth.getSession();
    if (session?.user) {
      const profile = await Auth.loadProfile(session.user.id);
      if (profile) {
        state.coins      = profile.coins;
        state.best       = profile.best_score;
        state.games      = profile.games;
        state.streak     = profile.streak;
        state.deathCount = profile.death_count;
        state.owned      = new Set(profile.owned_skins);
        state.equipped   = profile.equipped;
        document.getElementById('hm-username-btn').textContent = profile.username;
        App.showHome();
        return;
      }
    }
  } catch(e) {
    console.error('Auth init error:', e.message);
  }
  // Fallback garanti : affiche toujours l'écran d'accueil auth
  setTimeout(() => show('auth-landing'), 800);
})();

window.AuthUI = AuthUI;
