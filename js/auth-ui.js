'use strict';

// 1. DÉCLARATION DU STATE (Indispensable pour éviter le crash)
window.state = window.state || {
  coins: 0,
  best: 0,
  games: 0,
  streak: 0,
  deathCount: 0,
  owned: new Set(),
  equipped: 'default'
};

// 2. FONCTION SHOW AMÉLIORÉE
function show(sectionId) {
  const sections = ['loading', 'auth-landing', 'auth-login', 'auth-register', 'home', 'game-container', 'shop', 'leaderboard'];
  
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = (id === sectionId) ? 'block' : 'none';
    }
  });
}

let usernameTimer = null;

const AuthUI = {
  showLanding() { show('auth-landing'); },
  showLogin() { 
    show('auth-login'); 
    const err = document.getElementById('login-error');
    if (err) err.textContent = ''; 
  },
  showRegister() { 
    show('auth-register'); 
    const err = document.getElementById('reg-error');
    if (err) err.textContent = ''; 
  },

  async doLogin() {
    const email = document.getElementById('login-email')?.value.trim();
    const pwd = document.getElementById('login-pwd')?.value;
    const errEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    if (!errEl || !btn) return;

    errEl.textContent = '';
    if (!email || !pwd) { errEl.textContent = 'Remplis tous les champs.'; return; }

    btn.textContent = 'Connexion…'; btn.disabled = true;
    try {
      await Auth.signIn(email, pwd);
    } catch(e) {
      errEl.textContent = translateError(e.message);
      btn.textContent = 'Se connecter'; btn.disabled = false;
    }
  },

  async doRegister() {
    const username = document.getElementById('reg-username')?.value.trim();
    const email = document.getElementById('reg-email')?.value.trim();
    const pwd = document.getElementById('reg-pwd')?.value;
    const errEl = document.getElementById('reg-error');
    const btn = document.getElementById('reg-btn');

    if (!errEl || !btn) return;

    errEl.textContent = '';
    if (!username || !email || !pwd) { errEl.textContent = 'Remplis tous les champs.'; return; }
    if (username.length < 3) { errEl.textContent = 'Pseudo trop court (3 min).'; return; }
    if (pwd.length < 8) { errEl.textContent = 'Mot de passe trop court (8 min).'; return; }

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
    if (!el) return;
    clearTimeout(usernameTimer);
    if (val.length < 3) { el.textContent = ''; return; }
    el.textContent = '…';
    usernameTimer = setTimeout(async () => {
      try {
        const ok = await Auth.checkUsername(val);
        el.textContent = ok ? '✓' : '✗';
        el.style.color = ok ? '#30d158' : '#ff2d55';
      } catch (e) { el.textContent = ''; }
    }, 500);
  },

  async doLogout() {
    await Auth.signOut();
    show('auth-landing');
  },
};

function translateError(msg) {
  if (msg.includes('Invalid login')) return 'Email ou mot de passe incorrect.';
  if (msg.includes('already registered')) return 'Cet email est déjà utilisé.';
  if (msg.includes('Password should')) return 'Mot de passe trop court (8 min).';
  if (msg.includes('valid email')) return 'Email invalide.';
  return 'Erreur : ' + msg;
}

// Fonction de synchronisation pour éviter de répéter le code
function syncProfile(profile) {
  if (!profile) return;
  state.coins = profile.coins || 0;
  state.best = profile.best_score || 0;
  state.games = profile.games || 0;
  state.streak = profile.streak || 0;
  state.deathCount = profile.death_count || 0;
  state.owned = new Set(profile.owned_skins || []);
  state.equipped = profile.equipped || 'default';

  const userBtn = document.getElementById('hm-username-btn');
  if (userBtn) userBtn.textContent = profile.username;
}

// ── Écoute les changements d'auth ──
Auth.onAuthChange(async (event, session, profile) => {
  if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && profile) {
    syncProfile(profile);
    if (typeof App !== 'undefined') App.showHome();
    else show('home');
  } else if (event === 'SIGNED_OUT') {
    show('auth-landing');
  }
});

// ── Initialisation ──
(async () => {
  show('loading');
  try {
    const session = await Auth.getSession();
    if (session?.user) {
      const profile = await Auth.loadProfile(session.user.id);
      if (profile) {
        syncProfile(profile);
        if (typeof App !== 'undefined') App.showHome();
        else show('home');
      } else {
        show('auth-landing');
      }
    } else {
      // Petit délai pour l'effet visuel
      setTimeout(() => show('auth-landing'), 1000);
    }
  } catch (err) {
    console.error("Erreur Init:", err);
    show('auth-landing');
  }
})();

window.AuthUI = AuthUI;