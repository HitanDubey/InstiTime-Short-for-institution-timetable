document.addEventListener('DOMContentLoaded', () => {
  const steps = Array.from(document.querySelectorAll('.step-section'));
  const progressSteps = Array.from(document.querySelectorAll('.progress-bar .step'));
  const progressBar = document.querySelector('.progress-bar');

  function goToStep(n) {
    progressBar.setAttribute('data-step', n);
    progressSteps.forEach((step, i) => {
      step.classList.remove('active', 'done');
      if (i < n-1) step.classList.add('done');
      else if (i === n-1) step.classList.add('active');
    });
    steps.forEach(sec => sec.classList.remove('active'));
    setTimeout(() => steps[n-1].classList.add('active'), 50);
  }

  // Navigation
  document.getElementById('toPreview').addEventListener('click', () => {
    if (window.form && window.form.validate()) goToStep(2);
  });
  document.getElementById('backToEntry').addEventListener('click', () => goToStep(1));
  document.getElementById('toGenerate').addEventListener('click', () => {
    goToStep(3);
    setTimeout(() => {
      if (window.timetable && window.timetable.generate) {
        window.timetable.generate();
        goToStep(4);
      }
    }, 1500);
  });
  document.getElementById('printBtn').addEventListener('click', () => window.print());
  document.getElementById('restartBtn').addEventListener('click', () => {
    document.querySelector('.wizard-container').style.opacity = '0';
    document.querySelector('.wizard-container').style.transform = 'translateY(20px)';
    setTimeout(() => location.reload(), 300);
  });

  // Export listeners
  ['PDF', 'Excel', 'CSV', 'Word'].forEach(fmt => {
    document.getElementById(`export${fmt}`).addEventListener('click', () => {
      if (window.timetable && window.timetable[`export${fmt}`]) 
        window.timetable[`export${fmt}`]();
    });
  });

  goToStep(1);
});