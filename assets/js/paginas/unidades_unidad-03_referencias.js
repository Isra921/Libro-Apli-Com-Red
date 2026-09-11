
      document.addEventListener("DOMContentLoaded", () => {
        const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
        const panels = Array.from(
          document.querySelectorAll('[role="tabpanel"]'),
        );

        const activateTab = (selectedTab, moveFocus = false) => {
          tabs.forEach((tab) => {
            const isSelected = tab === selectedTab;
            tab.setAttribute("aria-selected", String(isSelected));
            tab.tabIndex = isSelected ? 0 : -1;
          });

          panels.forEach((panel) => {
            panel.hidden = panel.id !== selectedTab.getAttribute("aria-controls");
          });

          if (moveFocus) selectedTab.focus();
        };

        tabs.forEach((tab, index) => {
          tab.addEventListener("click", () => activateTab(tab));
          tab.addEventListener("keydown", (event) => {
            let nextIndex;

            if (event.key === "ArrowRight" || event.key === "ArrowDown") {
              nextIndex = (index + 1) % tabs.length;
            } else if (
              event.key === "ArrowLeft" ||
              event.key === "ArrowUp"
            ) {
              nextIndex = (index - 1 + tabs.length) % tabs.length;
            } else if (event.key === "Home") {
              nextIndex = 0;
            } else if (event.key === "End") {
              nextIndex = tabs.length - 1;
            } else {
              return;
            }

            event.preventDefault();
            activateTab(tabs[nextIndex], true);
          });
        });
      });
    


