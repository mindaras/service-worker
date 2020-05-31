"use strict";

let version = 6;
let isOnline = true;
let isLoggedIn = false;
const cacheName = `ramblings-${version}`;

const urlsToCache = {
  loggedOut: [
    "/",
    "/about",
    "/contact",
    "/404",
    "/login",
    "/offline",
    "/css/style.css",
    "/js/blog.js",
    "/js/home.js",
    "/js/login.js",
    "/js/add-post.js",
    "/images/logo.gif",
    "/images/offline.png",
  ],
};

const clearCaches = async () => {
  const cacheNames = await caches.keys();
  const oldCacheNames = cacheNames.filter((name) => {
    if (/^ramblings-\d+$/.test(name)) {
      const cacheVersion = name.split("-")[1];
      return parseInt(cacheVersion) !== version;
    }
  });

  return Promise.all(oldCacheNames.map((name) => caches.delete(name)));
};

const cacheLoggedOutFiles = async () => {
  const cache = await caches.open(cacheName);

  try {
    return Promise.all(
      urlsToCache.loggedOut.map(async (url) => {
        const res = await fetch(url, {
          method: "GET",
          cache: "no-cache",
          credentials: "omit",
        });

        if (res.ok) {
          cache.put(url, res);
        }
      })
    );
  } catch (e) {}
};

const onMessage = ({ data }) => {
  if (data.statusUpdate) {
    ({ isOnline, isLoggedIn } = data.statusUpdate);
    console.log(
      `Service worker (v${version}): received status update: isOnline: ${isOnline}, isLoggedIn: ${isLoggedIn}`
    );
  }
};

const sendMessage = async (msg) => {
  const allClients = await clients.matchAll({ includeUncontrolled: true });

  allClients.map((client) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = onMessage;
    client.postMessage(msg, channel.port2);
  });
};

const main = async () => {
  sendMessage({ requestStatusUpdate: true });
};

const onInstall = () => {
  console.log(`Service Worker (v${version}): installed`);
  self.skipWaiting();
};

const handleActivation = async () => {
  await clearCaches();
  await cacheLoggedOutFiles();
  await clients.claim();
  console.log(`Service Worker (v${version}): activated`);
  main().catch(console.error);
};

const onActivate = (evt) => {
  evt.waitUntil(handleActivation());
};

const router = async (req) => {
  const url = new URL(req.url);
  const reqUrl = url.pathname;
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(req.url, {
      method: req.method,
      headers: req.headers,
      credentials: "omit",
      cache: "no-store",
    });

    if (response && response.ok) {
      await cache.put(reqUrl, response.clone());
      return response;
    }
  } catch (err) {}

  const cachedResponse = await cache.match(reqUrl);

  if (cachedResponse) {
    return cachedResponse.clone();
  }
};

const onFetch = (evt) => {
  evt.respondWith(router(evt.request));
};

self.addEventListener("install", onInstall);
self.addEventListener("activate", onActivate);
self.addEventListener("message", onMessage);
self.addEventListener("fetch", onFetch);
