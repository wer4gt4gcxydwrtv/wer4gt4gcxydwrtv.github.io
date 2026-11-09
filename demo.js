/* KrewOS WebAssembly Sandbox Loader (`krewos_web.wasm` + Three.js 3D Orrery) */
(() => {
  "use strict";

  const DEMO_PATH = window.location.pathname;
  const bootParams = new URLSearchParams(window.location.search);
  const IS_EMBED = bootParams.get("embed") === "1";

  const nativeFetch = window.fetch.bind(window);
  const nativePushState = window.history.pushState.bind(window.history);
  const nativeReplaceState = window.history.replaceState.bind(window.history);
  const nativeIframeSetAttribute = HTMLIFrameElement.prototype.setAttribute;

  if (IS_EMBED) {
    const bar = document.getElementById("wasm-sandbox-bar");
    if (bar) bar.hidden = true;
  }
  if (IS_EMBED || bootParams.has("v")) {
    bootParams.delete("embed");
    bootParams.delete("v");
    const cleanQuery = bootParams.toString();
    nativeReplaceState(
      window.history.state,
      "",
      DEMO_PATH + (cleanQuery ? `?${cleanQuery}` : ""),
    );
  }

  function rewriteHistoryUrl(urlArg) {
    if (!urlArg) return urlArg;
    try {
      const parsed = new URL(String(urlArg), window.location.origin);
      if (parsed.origin === window.location.origin && parsed.pathname === "/") {
        return DEMO_PATH + parsed.search + parsed.hash;
      }
    } catch (_) {
      // Keep original on parse failure.
    }
    return urlArg;
  }

  function notifyParentView() {
    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage(
          {
            type: "krewos:demo-view",
            search: window.location.search || "",
          },
          window.location.origin,
        );
      } catch (_) {}
    }
  }

  window.history.pushState = function (state, title, url) {
    const result = nativePushState(state, title, rewriteHistoryUrl(url));
    notifyParentView();
    return result;
  };

  window.history.replaceState = function (state, title, url) {
    const result = nativeReplaceState(state, title, rewriteHistoryUrl(url));
    notifyParentView();
    return result;
  };

  /* ---- Mock EventSource for `/api/events` driven by `krewos_web.wasm` ---- */

  const activeSources = new Set();
  let sseSeq = 200;

  class WasmEventSource {
    constructor(url) {
      this.url = String(url || "/api/events");
      this.readyState = 1;
      this.onopen = null;
      this.onmessage = null;
      this.onerror = null;
      activeSources.add(this);
      queueMicrotask(() => {
        if (this.readyState === 1 && typeof this.onopen === "function") {
          try {
            this.onopen(new Event("open"));
          } catch (_) {}
        }
      });
    }

    close() {
      this.readyState = 2;
      activeSources.delete(this);
    }
  }

  window.EventSource = WasmEventSource;

  function emitSseEvents(rawEvents) {
    if (!Array.isArray(rawEvents) || rawEvents.length === 0) return;
    for (const raw of rawEvents) {
      if (typeof raw !== "string" || !raw) continue;
      sseSeq += 1;
      const lastEventId = String(sseSeq);
      for (const source of activeSources) {
        if (source.readyState === 1 && typeof source.onmessage === "function") {
          try {
            source.onmessage({
              data: raw,
              lastEventId,
              origin: window.location.origin,
            });
          } catch (err) {
            console.warn("krewos wasm sse:", err);
          }
        }
      }
    }
  }

  /* ---- Simulated Xtigervnc :99 / Chromium Viewport for the Browser Console ---- */

  const AGENT_BROWSER_PAGES = {
    helios: {
      uid: "10002:10002 (profile: /var/lib/krewos-browser/profiles/helios)",
      url: "https://github.com/krewos/krewos/releases/tag/v0.1.0",
      title: "Release v0.1.0 · krewos/krewos — Chromium (:99)",
      badge: "Helios · Circle Lead",
      accent: "#ffae52",
      heading: "krewos/krewos — Public Release Readiness v0.1.0",
      summary:
        "Single-container Distroless image (gcr.io/distroless/cc-debian13) verified. All 7 container-security-check.sh invariants green.",
      cards: [
        {
          label: "Container Digest",
          value: "ghcr.io/krewos:0.1.0 (sha256:9f84c2e1...4d85ced)",
        },
        {
          label: "Kernel Envelope",
          value: "read_only: true · cap_drop: [ALL] · cap_add: [SETUID, SETGID, KILL]",
        },
        {
          label: "Release Gate",
          value: "4/4 crew sign-offs complete (Helios, Forge, Lyra, Aegis)",
        },
      ],
    },
    forge: {
      uid: "10002:10002 (profile: /var/lib/krewos-browser/profiles/forge)",
      url: "https://docs.rs/axum/latest/axum/routing/struct.Router.html",
      title: "axum::routing::Router - Rust — Chromium (:99)",
      badge: "Forge · Systems & Rust Engineer",
      accent: "#38bdf8",
      heading: "axum::routing::Router — Bounded SqliteService & SSE Outbox",
      summary:
        "Inspecting transactional outbox replay (?after=<cursor> / Last-Event-ID) and backpressure saturation (503 store_busy at queue cap 128).",
      cards: [
        {
          label: "SQLite Executor",
          value: "Dedicated worker thread · IMMEDIATE migrations 1..=9",
        },
        {
          label: "Agent Sandbox",
          value: "UID 20001:20001 · /workspace/forge (mode 2770)",
        },
        {
          label: "Test Suite",
          value: "cargo test --workspace --all-targets: 0 failures",
        },
      ],
    },
    lyra: {
      uid: "10002:10002 (profile: /var/lib/krewos-browser/profiles/lyra)",
      url: "https://krewos.github.io/demo.html",
      title: "KrewOS 3D Orrery Shader Inspector — Chromium (:99)",
      badge: "Lyra · Spatial UI & Shader Architect",
      accent: "#c084fc",
      heading: "Three.js r186 Custom GLSL Shaders & Camera Choreography",
      summary:
        "Procedural solar corona, Rayleigh atmospheric rim, banded gas-giant turbulence, cratered rocky relief, and 60fps Genesis morphing.",
      cards: [
        {
          label: " deterministic PRNG",
          value: "FNV-1a 64-bit + SplitMix64 (server SVG == client 3D mesh)",
        },
        {
          label: "Typography",
          value: "Sora (UI & inscriptions) + Iosevka Term (PTY & code)",
        },
        {
          label: "WebGL Pipeline",
          value: "Instanced starfield + 3D whisper arcs + orbital rings",
        },
      ],
    },
    aegis: {
      uid: "10002:10002 (profile: /var/lib/krewos-browser/profiles/aegis)",
      url: "https://owasp.org/www-project-top-ten/",
      title: "Zero-Trust DAC & Secret Redaction Audit — Chromium (:99)",
      badge: "Aegis · Security & Sandbox Auditor",
      accent: "#3fe0a0",
      heading: "Verify the Cage — Kernel & Vault Security Audit",
      summary:
        "Confirming ChaCha20-Poly1305 per-agent secret encryption, HKDF-SHA256 derivation, and VaultRedactor scrubbing across tool outputs and PTY streams.",
      cards: [
        {
          label: "Browser Isolation",
          value: "Unix socket /var/lib/krewos-browser/run/vnc.sock (no TCP 5900)",
        },
        {
          label: "Playwright MCP",
          value: "127.0.0.1:8931/mcp guarded by x-krewos-mcp-token",
        },
        {
          label: "Cross-Agent DAC",
          value: "UID 20004 blocked from /workspace/forge (Permission denied)",
        },
      ],
    },
  };

  function buildSimulatedBrowserSrcdoc(agentId) {
    const page = AGENT_BROWSER_PAGES[agentId] || AGENT_BROWSER_PAGES.helios;
    const cardsHtml = page.cards
      .map(
        (c) => `
        <div class="card">
          <div class="card__label">${c.label}</div>
          <div class="card__val">${c.value}</div>
        </div>`,
      )
      .join("");
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: system-ui, -apple-system, sans-serif;
    background: #0a0d16;
    color: #e6ecff;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .wm-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.45rem 0.85rem;
    background: #111626;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    font-size: 0.72rem;
    color: #9aa6c8;
  }
  .wm-bar__left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .wm-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 99px;
    background: ${page.accent};
    box-shadow: 0 0 8px ${page.accent};
  }
  .url-bar {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 0.85rem;
    background: #0d111d;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.74rem;
  }
  .url-pill {
    flex: 1;
    padding: 0.32rem 0.65rem;
    border-radius: 6px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.09);
    color: #cfd8f6;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .badge {
    padding: 0.22rem 0.55rem;
    border-radius: 99px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    color: ${page.accent};
    font-weight: 600;
    font-size: 0.68rem;
  }
  .content {
    flex: 1;
    padding: 1.35rem 1.5rem;
    overflow-y: auto;
    background: radial-gradient(circle at 85% 15%, rgba(124, 156, 255, 0.08), transparent 55%);
  }
  h1 {
    margin: 0 0 0.5rem;
    font-size: 1.1rem;
    color: #ffffff;
  }
  p {
    margin: 0 0 1.15rem;
    font-size: 0.84rem;
    line-height: 1.55;
    color: #aab5d6;
    max-width: 64ch;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 0.75rem;
  }
  .card {
    padding: 0.8rem 0.9rem;
    border-radius: 10px;
    background: rgba(18, 23, 38, 0.85);
    border: 1px solid rgba(255,255,255,0.09);
  }
  .card__label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #8894b8;
    margin-bottom: 0.3rem;
  }
  .card__val {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.76rem;
    color: #eef2ff;
    line-height: 1.4;
  }
</style>
</head>
<body>
  <div class="wm-bar">
    <div class="wm-bar__left">
      <span class="wm-dot"></span>
      <strong>${page.title}</strong>
    </div>
    <span>${page.uid}</span>
  </div>
  <div class="url-bar">
    <span class="badge">${page.badge}</span>
    <div class="url-pill">🔒 ${page.url}</div>
  </div>
  <div class="content">
    <h1>${page.heading}</h1>
    <p>${page.summary}</p>
    <div class="grid">${cardsHtml}</div>
  </div>
</body>
</html>`;
  }

  function syncSimulatedBrowserViewport() {
    const frame = document.querySelector("[data-browser-frame]");
    const consoleEl = document.querySelector("[data-browser-console]");
    if (!frame || !consoleEl) return;
    const agentId = consoleEl.getAttribute("data-browser-agent") || "helios";
    frame.srcdoc = buildSimulatedBrowserSrcdoc(agentId);
  }

  HTMLIFrameElement.prototype.setAttribute = function (name, value) {
    if (
      this.hasAttribute("data-browser-frame") &&
      String(name).toLowerCase() === "src"
    ) {
      if (!value || value === "about:blank") {
        this.removeAttribute("srcdoc");
        return nativeIframeSetAttribute.call(this, "src", "about:blank");
      }
      syncSimulatedBrowserViewport();
      return;
    }
    return nativeIframeSetAttribute.call(this, name, value);
  };

  /* ---- WASM Instance & Bridge ---- */

  const encoder = new TextEncoder();
  const decoder = new TextDecoder("utf-8");
  let wasmExports = null;
  let tickTimer = 0;

  function readPackedSlice(packed) {
    const big = BigInt(packed);
    const ptr = Number((big >> 32n) & 0xffffffffn) >>> 0;
    const len = Number(big & 0xffffffffn) >>> 0;
    if (!ptr || !len) return "";
    return decoder.decode(new Uint8Array(wasmExports.memory.buffer, ptr, len));
  }

  function allocString(str) {
    const bytes = encoder.encode(str || "");
    if (bytes.byteLength === 0) return { ptr: 0, len: 0 };
    const ptr = wasmExports.krewos_demo_alloc(bytes.byteLength) >>> 0;
    new Uint8Array(wasmExports.memory.buffer, ptr, bytes.byteLength).set(bytes);
    return { ptr, len: bytes.byteLength };
  }

  function freeString(slice) {
    if (slice.ptr && slice.len) {
      wasmExports.krewos_demo_dealloc(slice.ptr, slice.len);
    }
  }

  function ensureTurnTicker() {
    if (tickTimer) return;
    tickTimer = window.setInterval(() => {
      if (!wasmExports) return;
      const rawJson = readPackedSlice(wasmExports.krewos_demo_tick());
      let events = [];
      try {
        events = JSON.parse(rawJson);
      } catch (_) {
        events = [];
      }
      if (!Array.isArray(events) || events.length === 0) {
        window.clearInterval(tickTimer);
        tickTimer = 0;
        return;
      }
      emitSseEvents(events);
    }, 520);
  }

  function wasmRequest(method, pathAndQuery, bodyText) {
    const m = allocString(method);
    const u = allocString(pathAndQuery);
    const b = allocString(bodyText);
    try {
      const packed = wasmExports.krewos_demo_request(
        m.ptr,
        m.len,
        u.ptr,
        u.len,
        b.ptr,
        b.len,
      );
      const raw = readPackedSlice(packed);
      const parsed = JSON.parse(raw);
      if (typeof parsed.body === "string") {
        parsed.body = parsed.body.replaceAll(
          'data-three-module="/vendor/three-0.186.1/three.module.js"',
          'data-three-module="./vendor/three-0.186.1/three.module.js"',
        );
      }
      return parsed;
    } finally {
      freeString(b);
      freeString(u);
      freeString(m);
    }
  }

  window.fetch = async function (input, init) {
    const rawUrl =
      typeof input === "string"
        ? input
        : input && typeof input.url === "string"
          ? input.url
          : String(input);
    let parsed = null;
    try {
      parsed = new URL(rawUrl, window.location.origin);
    } catch (_) {
      parsed = null;
    }

    if (
      wasmExports &&
      parsed &&
      parsed.origin === window.location.origin &&
      (parsed.pathname.startsWith("/ui/") || parsed.pathname.startsWith("/api/"))
    ) {
      const method = (
        init && init.method ? String(init.method) : "GET"
      ).toUpperCase();
      let bodyText = "";
      if (init && init.body != null) {
        if (typeof init.body === "string") {
          bodyText = init.body;
        } else if (init.body instanceof Blob) {
          bodyText = `<binary:${init.body.size}>`;
        } else if (
          init.body instanceof ArrayBuffer ||
          ArrayBuffer.isView(init.body)
        ) {
          bodyText = `<binary:${init.body.byteLength}>`;
        } else {
          bodyText = String(init.body);
        }
      }

      const pathAndQuery = parsed.pathname + parsed.search;
      const envelope = wasmRequest(method, pathAndQuery, bodyText);

      if (Array.isArray(envelope.events) && envelope.events.length > 0) {
        const queued = envelope.events.slice();
        window.setTimeout(() => {
          emitSseEvents(queued);
          if (parsed.pathname === "/api/turns") {
            ensureTurnTicker();
          }
        }, 24);
      }

      if (parsed.pathname === "/ui/browser") {
        window.setTimeout(syncSimulatedBrowserViewport, 16);
      }

      return new Response(envelope.body || "", {
        status: envelope.status || 200,
        headers: {
          "Content-Type": envelope.content_type || "text/plain; charset=utf-8",
        },
      });
    }

    return nativeFetch(input, init);
  };

  /* ---- Programmatic Navigation & Reset Helpers ---- */

  function closeOpenModals() {
    for (const dialog of document.querySelectorAll("dialog[open]")) {
      try {
        if (typeof dialog.close === "function") dialog.close();
        else dialog.removeAttribute("open");
      } catch (_) {
        dialog.removeAttribute("open");
      }
    }
  }

  function triggerCosmosLink(href) {
    closeOpenModals();
    const root = document.querySelector("[data-cosmos]");
    if (!root) return;
    const tempLink = document.createElement("a");
    tempLink.href = href;
    tempLink.style.display = "none";
    root.appendChild(tempLink);
    tempLink.click();
    tempLink.remove();
  }

  function resetSandbox() {
    if (!wasmExports) return;
    if (tickTimer) {
      window.clearInterval(tickTimer);
      tickTimer = 0;
    }
    closeOpenModals();
    wasmExports.krewos_demo_reset();
    triggerCosmosLink("/");
  }

  document.addEventListener(
    "submit",
    (event) => {
      const form = event.target;
      if (
        form instanceof HTMLFormElement &&
        form.getAttribute("action") === "/logout"
      ) {
        event.preventDefault();
        if (IS_EMBED) {
          resetSandbox();
        } else {
          window.location.assign("index.html");
        }
      }
    },
    true,
  );

  document.getElementById("wasm-reset-btn")?.addEventListener("click", () => {
    resetSandbox();
  });

  window.addEventListener("message", (event) => {
    if (event.origin && event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || typeof data !== "object" || data.type !== "krewos:demo-cmd") {
      return;
    }
    if (data.cmd === "navigate" && typeof data.href === "string") {
      triggerCosmosLink(data.href);
    } else if (data.cmd === "reset") {
      resetSandbox();
    } else if (data.cmd === "genesis") {
      closeOpenModals();
      const btn = document.querySelector("[data-circles-create-agent]");
      if (btn instanceof HTMLElement) btn.click();
    } else if (data.cmd === "terminal") {
      const dialog = document.querySelector("[data-terminal-dialog]");
      if (!dialog || !dialog.open) {
        const btn = document.querySelector("[data-circles-terminal]");
        if (btn instanceof HTMLElement) btn.click();
      }
    } else if (data.cmd === "explorer") {
      const dialog = document.querySelector("[data-workspace-dialog]");
      if (!dialog || !dialog.open) {
        const btn = document.querySelector("[data-circles-workspace]");
        if (btn instanceof HTMLElement) btn.click();
      }
    } else if (data.cmd === "browser") {
      const dialog = document.querySelector("[data-browser-dialog]");
      if (!dialog || !dialog.open) {
        const btn = document.querySelector("[data-circles-browser]");
        if (btn instanceof HTMLElement) btn.click();
      }
    } else if (data.cmd === "vault") {
      const dialog = document.querySelector("[data-vault-dialog]");
      if (!dialog || !dialog.open) {
        const btn = document.querySelector("[data-circles-vault]");
        if (btn instanceof HTMLElement) btn.click();
      }
    }
  });

  /* ---- Instantiate `krewos_web.wasm` and Boot ---- */

  async function instantiateWasm(url, imports) {
    if (typeof WebAssembly.instantiateStreaming === "function") {
      try {
        return await WebAssembly.instantiateStreaming(nativeFetch(url), imports);
      } catch (_) {
        // Fallback if server MIME type is not application/wasm
      }
    }
    const resp = await nativeFetch(url);
    const bytes = await resp.arrayBuffer();
    return await WebAssembly.instantiate(bytes, imports);
  }

  async function bootWasmSandbox() {
    const statusEl = document.getElementById("wasm-boot-status");
    try {
      const noopProxy = new Proxy({}, { get: () => () => 0 });
      const imports = {
        __wbindgen_placeholder__: noopProxy,
        __wbindgen_externref_xform__: noopProxy,
      };

      const { instance } = await instantiateWasm("krewos_web.wasm", imports);
      wasmExports = instance.exports;

      if (statusEl) {
        statusEl.textContent = "Mounting KrewOS Observatory…";
      }

      // 0 = APP_CSS, 1 = SHELL_PROGRESSIVE_JS
      const rawCss = readPackedSlice(wasmExports.krewos_demo_asset(0));
      const appCss = rawCss
        .replaceAll('url("/fonts/', 'url("fonts/')
        .replaceAll("url('/fonts/", "url('fonts/");
      const styleEl = document.getElementById("krewos-app-css");
      if (styleEl) styleEl.textContent = appCss;

      // Render initial view matching current query string (?agent=... or ?circle=...)
      const initialSearch = window.location.search || "";
      const initialCosmos = wasmRequest(
        "GET",
        "/ui/cosmos" + initialSearch,
        "",
      );
      const mountEl = document.getElementById("krewos-cosmos-mount");
      if (mountEl) {
        mountEl.outerHTML = initialCosmos.body.replace(
          'data-three-module="/vendor/three-0.186.1/three.module.js"',
          'data-three-module="./vendor/three-0.186.1/three.module.js"',
        );
      }

      // Patch SHELL_PROGRESSIVE_JS so:
      // 1) `/demo.html` is accepted alongside `/` as the Cosmos document pathname
      // 2) Relative Three.js module path works even if deployed under a subpath
      const rawJs = readPackedSlice(wasmExports.krewos_demo_asset(1));
      const patchedJs = rawJs
        .replaceAll(
          'url.pathname !== "/"',
          '(url.pathname !== "/" && url.pathname !== window.location.pathname)',
        )
        .replaceAll(
          '"/vendor/three-0.186.1/three.module.js"',
          '"./vendor/three-0.186.1/three.module.js"',
        );

      const scriptEl = document.createElement("script");
      scriptEl.id = "krewos-shell-progressive";
      scriptEl.textContent = patchedJs;
      document.body.appendChild(scriptEl);

      const bootOverlay = document.getElementById("wasm-boot");
      if (bootOverlay) {
        bootOverlay.setAttribute("data-ready", "true");
        window.setTimeout(() => bootOverlay.remove(), 320);
      }

      notifyParentView();
    } catch (err) {
      console.error("Failed to boot KrewOS WASM sandbox:", err);
      if (statusEl) {
        statusEl.textContent =
          "Failed to initialize WebAssembly sandbox: " +
          (err && err.message ? err.message : String(err));
      }
    }
  }

  bootWasmSandbox();
})();
