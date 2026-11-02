import { start } from "./app";

start();

// Offline: the service worker keeps the app shell cached. It only registers on a real host.
if ("serviceWorker" in navigator && location.protocol === "https:" && !location.hostname.endsWith("claude.ai") && !location.hostname.endsWith("claudeusercontent.com")) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
