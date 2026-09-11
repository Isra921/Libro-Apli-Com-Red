document.querySelectorAll('[data-activity-toggle]').forEach((control) => {
  control.addEventListener('click', () => {
    const target = document.querySelector(control.dataset.activityToggle);
    target?.classList.toggle('active');
  });
});


