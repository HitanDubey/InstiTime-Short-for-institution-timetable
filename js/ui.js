// UI enhancements: 3D button tilt, subtle background parallax
(function(){
  // Button tilt on hover: add transform based on mouse position
  function bindButtonTilt() {
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width/2;
        const cy = rect.height/2;
        const dx = (x - cx) / cx;
        const dy = (y - cy) / cy;
        btn.style.transform = `perspective(600px) rotateX(${ -dy * 6 }deg) rotateY(${ dx * 8 }deg) translateZ(6px)`;
        btn.style.boxShadow = '0 12px 30px rgba(20,20,40,0.18)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
        btn.style.boxShadow = '';
      });
      btn.addEventListener('mousedown', () => {
        btn.style.transform += ' scale(0.98)';
      });
      btn.addEventListener('mouseup', () => {
        btn.style.transform = '';
      });
    });
  }

  // Background video subtle parallax (move on mouse)
  function bindBgParallax() {
    const video = document.getElementById('bgVideo');
    if (!video) return;
    document.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 6; // percent
      const y = (e.clientY / window.innerHeight - 0.5) * 6;
      video.style.transform = `translate(${ -x }px, ${ -y }px) scale(1.05)`;
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindButtonTilt();
    bindBgParallax();
  });
})();
