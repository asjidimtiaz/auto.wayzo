const jwt = require('jsonwebtoken');

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  if (secret.length < 32) console.warn('WARNING: JWT_SECRET should be at least 32 characters for security');
  return secret;
}

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role || 'admin',
      auto_ecole_id: user.auto_ecole_id || null,
      slug: user.slug || null,
    },
    getSecret(),
    { expiresIn: '24h' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, getSecret());
  } catch {
    return null;
  }
}

function getTokenFromRequest(req) {
  const cookieStr = req.headers.get('cookie') || '';
  console.log('DEBUG: Cookie header:', cookieStr);
  const match = cookieStr.match(/auth_token=([^;]+)/);
  if (match) return match[1];
  const auth = req.headers.get('authorization') || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

function isAuthenticated(req) {
  const token = getTokenFromRequest(req);
  return token ? verifyToken(token) : null;
}

module.exports = { generateToken, verifyToken, getTokenFromRequest, isAuthenticated };
