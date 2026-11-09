(function () {
  "use strict";

  // 1. Interactive Meridian Console tab switcher
  var consoleTabs = document.querySelectorAll(".console-tab[data-panel]");
  var consolePanels = document.querySelectorAll(".console-panel");

  consoleTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var targetId = tab.getAttribute("data-panel");
      consoleTabs.forEach(function (t) {
        var active = t === tab;
        t.classList.toggle("active", active);
        t.setAttribute("aria-selected", active ? "true" : "false");
      });
      consolePanels.forEach(function (panel) {
        var match = panel.id === targetId;
        panel.classList.toggle("active", match);
        panel.hidden = !match;
      });
    });
  });

  // 2. OS Certificate Trust tab switcher
  var osTabs = document.querySelectorAll(".os-tab[data-os]");
  var osPanels = document.querySelectorAll(".os-panel");

  osTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var targetId = tab.getAttribute("data-os");
      osTabs.forEach(function (t) {
        t.classList.toggle("active", t === tab);
      });
      osPanels.forEach(function (panel) {
        var match = panel.id === targetId;
        panel.classList.toggle("active", match);
        panel.hidden = !match;
      });
    });
  });

  // 3. One-click clipboard copy buttons
  var copyButtons = document.querySelectorAll(".copy-btn");

  copyButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      if (!text) {
        var targetId = btn.getAttribute("data-copy-target");
        var codeEl = targetId ? document.getElementById(targetId) : null;
        text = codeEl ? codeEl.textContent : "";
      }
      if (!text || !navigator.clipboard) {
        return;
      }
      var originalLabel = btn.textContent;
      navigator.clipboard.writeText(text.trim()).then(function () {
        btn.textContent = "Copied!";
        setTimeout(function () {
          btn.textContent = originalLabel;
        }, 1600);
      });
    });
  });
})();
