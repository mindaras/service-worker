"use strict";

var curFib = 0;

// **********************************

function fib(n) {
  if (n < 2) {
    return n;
  }
  return fib(n - 1) + fib(n - 2);
}

const getNextFib = () => {
  const fibNum = fib(curFib);
  self.postMessage({ idx: curFib, fib: fibNum });
  curFib++;
  getNextFib();
};

self.onmessage = getNextFib;
