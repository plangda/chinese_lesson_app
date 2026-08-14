const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getDb } = require('./database');
const crypto = require('crypto');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET environment variable is missing. Authentication features will be disabled/fail.");
}

// In-memory rate limiter for password reset attempts (Max 5 attempts per identifier per 15 minutes)
const resetAttempts = new Map();

function checkResetRateLimit(identifier) {
  const key = (identifier || '').trim().toLowerCase();
  const now = Date.now();
  const record = resetAttempts.get(key) || { count: 0, firstAttempt: now };

  if (now - record.firstAttempt > 15 * 60 * 1000) {
    // Reset window expired
    resetAttempts.set(key, { count: 1, firstAttempt: now });
    return true;
  }

  if (record.count >= 5) {
    return false; // Rate limit exceeded
  }

  record.count += 1;
  resetAttempts.set(key, record);
  return true;
}

function clearResetRateLimit(identifier) {
  const key = (identifier || '').trim().toLowerCase();
  resetAttempts.delete(key);
}

// 1. REGISTER USER
router.post('/register', async (req, res) => {
  let { username, email, password, name, securityQuestion, securityAnswer } = req.body;

  if (!username || !password || !securityQuestion || !securityAnswer) {
    return res.status(400).json({ error: 'Username, password, security question, and answer are required.' });
  }

  username = username.trim();
  const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : null;
  const cleanName = (name && name.trim()) ? name.trim() : username;
  const normalizedAnswer = securityAnswer.trim().toLowerCase();

  if (username.length < 2) {
    return res.status(400).json({ error: 'Username must be at least 2 characters long.' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
  }

  try {
    const db = await getDb();

    // Check if username already exists
    const existingUser = await db.get('SELECT id FROM users WHERE username = ? COLLATE NOCASE', [username]);
    if (existingUser) {
      return res.status(400).json({ error: 'This username is already taken. Please choose another one.' });
    }

    // If email provided, check if email exists
    if (cleanEmail) {
      const existingEmail = await db.get('SELECT id FROM users WHERE email = ? COLLATE NOCASE', [cleanEmail]);
      if (existingEmail) {
        return res.status(400).json({ error: 'This email is already registered.' });
      }
    }

    // Hash password and security answer
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const answerHash = await bcrypt.hash(normalizedAnswer, salt);

    const userId = crypto.randomUUID();

    // Transactional registration + user_progress initialization
    const tx = await db.transaction();
    try {
      await tx.run(
        `INSERT INTO users (id, username, email, password_hash, name, security_question, security_answer_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, username, cleanEmail, passwordHash, cleanName, securityQuestion, answerHash]
      );

      await tx.run('INSERT INTO user_progress (user_id) VALUES (?)', [userId]);
      await tx.commit();
    } catch (txErr) {
      await tx.rollback();
      throw txErr;
    }

    if (!JWT_SECRET) {
      return res.status(500).json({ error: 'Authentication is not configured on this server (missing JWT_SECRET).' });
    }

    const token = jwt.sign({ id: userId, username, email: cleanEmail }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      success: true,
      token,
      user: { id: userId, username, email: cleanEmail, name: cleanName }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration: ' + error.message });
  }
});

// 2. LOGIN USER (Username OR Email)
router.post('/login', async (req, res) => {
  let { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Username/Email and password are required.' });
  }

  const cleanIdent = identifier.trim();

  try {
    const db = await getDb();
    const user = await db.get(
      `SELECT * FROM users 
       WHERE username = ? COLLATE NOCASE 
          OR (email IS NOT NULL AND email = ? COLLATE NOCASE)`,
      [cleanIdent, cleanIdent]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    if (!JWT_SECRET) {
      return res.status(500).json({ error: 'Authentication is not configured on this server (missing JWT_SECRET).' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, email: user.email, name: user.name }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login: ' + error.message });
  }
});

// 3. FORGOT PASSWORD STEP 1: Get Security Question
router.post('/forgot-password/get-question', async (req, res) => {
  const { identifier } = req.body;
  if (!identifier || !identifier.trim()) {
    return res.status(400).json({ error: 'Please provide your username or email.' });
  }

  const cleanIdent = identifier.trim();
  try {
    const db = await getDb();
    const user = await db.get(
      `SELECT id, username, security_question FROM users 
       WHERE username = ? COLLATE NOCASE 
          OR (email IS NOT NULL AND email = ? COLLATE NOCASE)`,
      [cleanIdent, cleanIdent]
    );

    if (!user || !user.security_question) {
      return res.status(404).json({ error: 'Account not found or no security question set.' });
    }

    res.json({
      success: true,
      username: user.username,
      securityQuestion: user.security_question
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. FORGOT PASSWORD STEP 2: Verify Security Answer & Issue 5-Min Reset Token
router.post('/forgot-password/verify-answer', async (req, res) => {
  const { identifier, answer } = req.body;
  if (!identifier || !answer) {
    return res.status(400).json({ error: 'Username and security answer are required.' });
  }

  const cleanIdent = identifier.trim();
  const normalizedAnswer = answer.trim().toLowerCase();

  // Check rate limit (max 5 attempts / 15 mins)
  if (!checkResetRateLimit(cleanIdent)) {
    return res.status(429).json({ error: 'Too many recovery attempts. Please wait 15 minutes before trying again.' });
  }

  try {
    const db = await getDb();
    const user = await db.get(
      `SELECT id, username, security_answer_hash FROM users 
       WHERE username = ? COLLATE NOCASE 
          OR (email IS NOT NULL AND email = ? COLLATE NOCASE)`,
      [cleanIdent, cleanIdent]
    );

    if (!user || !user.security_answer_hash) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    const isMatch = await bcrypt.compare(normalizedAnswer, user.security_answer_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect security answer. Please try again.' });
    }

    // Success -> Clear rate limit record
    clearResetRateLimit(cleanIdent);

    // Issue short-lived 5-minute reset token
    const resetToken = jwt.sign(
      { id: user.id, username: user.username, purpose: 'pwd_reset' },
      JWT_SECRET,
      { expiresIn: '5m' }
    );

    res.json({
      success: true,
      resetToken,
      username: user.username
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. FORGOT PASSWORD STEP 3: Set New Password with Reset Token
router.post('/forgot-password/set-new-password', async (req, res) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) {
    return res.status(400).json({ error: 'Reset token and new password are required.' });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters long.' });
  }

  try {
    const decoded = jwt.verify(resetToken, JWT_SECRET);
    if (decoded.purpose !== 'pwd_reset') {
      return res.status(403).json({ error: 'Invalid reset token purpose.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    const db = await getDb();
    await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, decoded.id]);

    // Generate fresh 30-day session token
    const token = jwt.sign({ id: decoded.id, username: decoded.username }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      message: 'Password reset successfully!',
      token,
      user: { id: decoded.id, username: decoded.username }
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Password reset session has expired (5 minute limit). Please restart recovery.' });
    }
    res.status(401).json({ error: 'Invalid or expired reset token.' });
  }
});

// Auth Middleware (Strict JWT Required)
const requireAuth = (req, res, next) => {
  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'Authentication is not configured on this server (missing JWT_SECRET).' });
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized, no token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ error: 'Unauthorized, invalid token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized, token expired or invalid' });
  }
};

// Optional Auth Middleware (Attaches req.user if valid token provided, but doesn't block guests)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ') && JWT_SECRET) {
    const token = authHeader.split(' ')[1];
    if (token && token !== 'null' && token !== 'undefined') {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
      } catch (e) {}
    }
  }
  next();
};

module.exports = { router, requireAuth, optionalAuth };
