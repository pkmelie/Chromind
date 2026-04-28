'use strict';

// ─────────────────────────────────────────────
//  STRIPE INTEGRATION
//  Remplace STRIPE_PUBLIC_KEY par ta vraie clé
//  depuis dashboard.stripe.com → Developers → API keys
// ─────────────────────────────────────────────
const STRIPE_PUBLIC_KEY = 'pk_live_VOTRE_CLE_STRIPE_ICI';

const Stripe = {
  formatCard(input) {
    let v = input.value.replace(/\D/g, '').slice(0, 16);
    input.value = v.replace(/(.{4})/g, '$1 ').trim();
  },

  formatExp(input) {
    let v = input.value.replace(/\D/g, '').slice(0, 4);
    if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2);
    input.value = v;
  },

  async pay() {
    const amount = window._pendingCoins;
    if (!amount) return;

    const btn = document.querySelector('#stripe-modal .cta-btn');
    btn.textContent = 'Traitement…';
    btn.disabled = true;

    // ─────────────────────────────────────────
    // TODO: Appelle ton backend pour créer un
    // PaymentIntent Stripe et confirmer le paiement.
    //
    // Exemple de backend (Node.js/Express) :
    //
    // app.post('/create-payment-intent', async (req, res) => {
    //   const { amount } = req.body;
    //   const priceMap = { 100: 99, 500: 399, 1200: 799 }; // cents
    //   const intent = await stripe.paymentIntents.create({
    //     amount: priceMap[amount] || 99,
    //     currency: 'eur',
    //   });
    //   res.json({ clientSecret: intent.client_secret });
    // });
    //
    // Pour tester sans backend, simule un délai :
    // ─────────────────────────────────────────

    await new Promise(r => setTimeout(r, 1500)); // Simule le réseau

    // Succès simulé — remplace par la vraie confirmation Stripe
    state.coins += amount;
    save();
    document.getElementById('sh-coins').textContent = state.coins;
    App.closeModal();

    // Feedback visuel
    const toast = document.createElement('div');
    toast.textContent = '+' + amount + ' ◈ ajoutés !';
    toast.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:#f0f0f5;color:#0a0a0f;padding:12px 24px;border-radius:20px;font-family:Space Mono,monospace;font-size:13px;font-weight:700;z-index:9999;letter-spacing:1px';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);

    btn.textContent = 'Payer';
    btn.disabled = false;
  }
};

window.Stripe = Stripe;
