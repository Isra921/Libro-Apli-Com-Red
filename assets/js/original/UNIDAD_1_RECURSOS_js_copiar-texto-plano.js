(function () {
    function normalizeCopiedText(text) {
        return text
            .replace(/\u00a0/g, ' ')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    document.addEventListener('copy', function (event) {
        const target = event.target;

        if (target?.closest?.('input, textarea, [contenteditable="true"], [data-preserve-copy-format]')) {
            return;
        }

        const selection = window.getSelection();

        if (!selection || selection.isCollapsed) {
            return;
        }

        const text = normalizeCopiedText(selection.toString());

        if (!text || !event.clipboardData) {
            return;
        }

        event.clipboardData.setData('text/plain', text);
        event.preventDefault();
    });
})();

