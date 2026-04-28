'use strict';

// Fonction pour afficher une section et cacher les autres
function show(sectionId) {
  // Liste de toutes tes sections (ID correspondants dans ton HTML)
  const sections = ['loading', 'auth-landing', 'auth-login', 'auth-register', 'home', 'game-container'];
  
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = (id === sectionId) ? 'block' : 'none';
    }
  });
}

// ── Debounce helper ──
let usernameTimer = null;

const AuthUI = {
  showLanding() { show('auth-landing'); },
  showLogin()   { show('auth-login'); document.getElementById('login-error').textContent = ''; },
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
      // onAuthChange s'occupe de la redirection
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
    errEl.textContent = '';

    if (!username || !email || !pwd) { errEl.textContent = 'Remplis tous les champs.'; return; }
    if (username.length < 3) { errEl.textContent = 'Pseudo trop court (3 min).'; return; }
    if (pwd.length < 8) { errEl.textContent = 'Mot de passe trop court (8 min).'; return; }

    btn.textContent = 'Création…'; btn.disabled = true;
    try {
      await Auth.signUp(email, pwd, username);
      errEl.style.color = '#30d158';
      errEl.textContent = 'Compte créé ! Vérifie ton email pour confirmer.';
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
      const ok = await Auth.checkUsername(val);
      el.textContent = ok ? '✓' : '✗';
      el.style.color  = ok ? '#30d158' : '#ff2d55';
    }, 500);
  },

  async doLogout() {
    await Auth.signOut();
    show('auth-landing');
  },
};

// ── Traduire les erreurs Supabase ──
function translateError(msg) {
  if (msg.includes('Invalid login')) return 'Email ou mot de passe incorrect.';
  if (msg.includes('already registered')) return 'Cet email est déjà utilisé.';
  if (msg.includes('Password should')) return 'Mot de passe trop court (8 min).';
  if (msg.includes('valid email')) return 'Email invalide.';
  if (msg.includes('Ce pseudo')) return msg;
  return 'Erreur : ' + msg;
}

// ── Écoute les changements d'auth Supabase ──
Auth.onAuthChange(async (event, session, profile) => {
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    if (profile) {
      // Sync state local depuis Supabase
      state.coins    = profile.coins;
      state.best     = profile.best_score;
      state.games    = profile.games;
      state.streak   = profile.streak;
      state.deathCount = profile.death_count;
      state.owned    = new Set(profile.owned_skins);
      state.equipped = profile.equipped;
      // Affiche l'accueil
      document.getElementById('hm-username-btn').textContent = profile.username;
      App.showHome();
    }
  } else if (event === 'SIGNED_OUT') {
    show('auth-landing');
  }
});

// ── Init : vérifie si session existante ──
(async () => {
  show('loading');
  const session = await Auth.getSession();
  if (session?.user) {
    const profile = await Auth.loadProfile(session.user.id);
    if (profile) {
      state.coins    = profile.coins;
      state.best     = profile.best_score;
      state.games    = profile.games;
      state.streak   = profile.streak;
      state.deathCount = profile.death_count;
      state.owned    = new Set(profile.owned_skins);
      state.equipped = profile.equipped;
      document.getElementById('hm-username-btn').textContent = profile.username;
      App.showHome();
    } else {
      show('auth-landing');
    }
  } else {
    setTimeout(() => show('auth-landing'), 1200);
  }
})();

window.AuthUI = AuthUI;
