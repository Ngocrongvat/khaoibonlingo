// app-main.js — instantiates the app. MUST be the last app-* script tag.
const app = new DuoClone();

// The app object is live - fade out the boot splash (index.html shows it instantly
// while the multi-MB course data downloads/parses, so the first paint is never a
// frozen white page). Removal is guarded: if the splash is already gone (the 20s
// CSS fail-safe fired) this is a no-op.
(function hideBootSplash() {
    const splash = document.getElementById('boot-splash');
    if (!splash) return;
    splash.classList.add('done');
    setTimeout(() => splash.remove(), 450);
})();
