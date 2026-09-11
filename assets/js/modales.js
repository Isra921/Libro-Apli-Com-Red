document.querySelectorAll('[data-modal-close]').forEach((button) => {
  button.addEventListener('click', () => {
    button.closest('[role="dialog"]')?.classList.remove('show', 'active');
  });
});


