const store = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of store) {
    if (now - val.firstAttempt > val.windowMs) store.delete(key);
  }
}, 300_000);

function checkRateLimit(key, { maxAttempts = 5, windowMs = 900_000 } = {}) {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.firstAttempt > windowMs) {
    store.set(key, { count: 1, firstAttempt: now, windowMs });
    return { allowed: true, remaining: maxAttempts - 1, resetMs: windowMs };
  }

  entry.count++;
  if (entry.count > maxAttempts) {
    return { allowed: false, remaining: 0, resetMs: windowMs - (now - entry.firstAttempt) };
  }
  return { allowed: true, remaining: maxAttempts - entry.count, resetMs: windowMs - (now - entry.firstAttempt) };
}

module.exports = { checkRateLimit };
