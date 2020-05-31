(function Blog() {
  "use strict";

  var offlineIcon;
  let isOnline = navigator.onLine;
  var isLoggedIn = /isLoggedIn=1/.test(document.cookie.toString() || "");
  const usingSw = !!navigator.serviceWorker;
  let swRegistration;
  let svcWorker;

  document.addEventListener("DOMContentLoaded", ready, false);

  // **********************************

  const sendSWMessage = (msg, target) => {
    if (target) {
      target.postMessage(msg);
      return;
    }

    if (svcWorker) {
      svcWorker.postMessage(msg);
      return;
    }

    navigator.serviceWorker.controller.postMessage(msg);
  };

  const sendStatusUpdate = (target) => {
    console.log(
      `Client: sending status update: isOnline: ${isOnline}, isLoggedIn: ${isLoggedIn}`
    );
    sendSWMessage({ statusUpdate: { isOnline, isLoggedIn } }, target);
  };

  const onSWMessage = ({ data, ports }) => {
    if (data.requestStatusUpdate) {
      console.log("Client: received status update request from service worker");
      sendStatusUpdate(ports && ports[0]);
    }
  };

  const initServiceWorker = async () => {
    if (!usingSw) return;

    swRegistration = await navigator.serviceWorker.register("/sw.js", {
      updateViaCache: "none",
    });

    svcWorker =
      swRegistration.installing ||
      swRegistration.waiting ||
      swRegistration.active;

    sendStatusUpdate(svcWorker);

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      svcWorker = navigator.serviceWorker.controller;
      sendStatusUpdate(svcWorker);
    });

    navigator.serviceWorker.addEventListener("message", onSWMessage);
  };

  function ready() {
    offlineIcon = document.getElementById("connectivity-status");

    if (!isOnline) {
      document.getElementById("connectivity-status").classList.remove("hidden");
    }

    window.addEventListener("online", () => {
      document.getElementById("connectivity-status").classList.add("hidden");
      isOnline = true;
      sendStatusUpdate();
    });

    window.addEventListener("offline", () => {
      document.getElementById("connectivity-status").classList.remove("hidden");
      isOnline = false;
      sendStatusUpdate();
    });

    initServiceWorker().catch(console.error);
  }
})();
