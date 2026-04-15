// WhamBible App JS

// Toast notification
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// Coming soon handler
function showComingSoon(feature) {
  showToast(`${feature} — Coming Soon! ⚔️`);
}

// Language buttons — EN active, others show coming soon
document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const lang = btn.dataset.lang;
    if (lang === 'en') {
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    } else {
      showToast(`${btn.textContent.trim()} — Multilingual coming soon! 🌍`);
    }
  });
});

// Ambient particle animation
function createParticles() {
  const container = document.body;
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    p.style.cssText = `
      position: fixed;
      width: ${1 + Math.random() * 2}px;
      height: ${1 + Math.random() * 2}px;
      border-radius: 50%;
      background: rgba(201,162,39,${0.2 + Math.random() * 0.4});
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      pointer-events: none;
      z-index: 0;
      animation: particle-float ${3 + Math.random() * 4}s ease-in-out infinite;
      animation-delay: ${Math.random() * 3}s;
    `;
    container.appendChild(p);
  }
}

const style = document.createElement('style');
style.textContent = `
  @keyframes particle-float {
    0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
    50% { transform: translateY(-${10 + Math.random() * 20}px) scale(1.5); opacity: 0.8; }
  }
`;
document.head.appendChild(style);
createParticles();
