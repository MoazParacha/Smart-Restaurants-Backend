const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const otpStore = {};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

router.post('/register', register);
router.post('/login', login);

// Step 1 – Email check + OTP send
router.post('/check-email', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });
  db.query('SELECT id FROM users WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    if (results.length === 0) return res.status(404).json({ message: 'Email not found' });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { otp, expires: Date.now() + 10 * 60 * 1000 };
    transporter.sendMail({
      from: `"SmartRestaurant" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset OTP – SmartRestaurant',
      html: `
        <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:30px;background:#111111;color:white;border-radius:16px;border:1px solid #222">
          <div style="text-align:center;margin-bottom:20px">
            <div style="background:linear-gradient(135deg,#fbbf24,#f97316);width:60px;height:60px;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;font-size:28px">🍽️</div>
            <h2 style="color:#fbbf24;margin:12px 0 4px">SmartRestaurant</h2>
            <p style="color:#888;font-size:13px;margin:0">Password Reset Request</p>
          </div>
          <p style="color:#ccc;font-size:14px">Your OTP code is:</p>
          <div style="font-size:40px;font-weight:bold;color:#fbbf24;letter-spacing:10px;padding:24px;background:#1a1a1a;border-radius:12px;text-align:center;border:1px solid #2a2a2a">${otp}</div>
          <p style="color:#888;font-size:12px;margin-top:16px;text-align:center">This OTP expires in <strong style="color:#f97316">10 minutes</strong>.</p>
          <p style="color:#555;font-size:11px;text-align:center">If you didn't request this, ignore this email.</p>
        </div>
      `,
    }, (err) => {
      if (err) { console.error('Email error:', err); return res.status(500).json({ message: 'Failed to send email. Try again.' }); }
      res.json({ message: 'OTP sent to your email!' });
    });
  });
});

// Step 2 – OTP verify
router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const stored = otpStore[email];
  if (!stored) return res.status(400).json({ message: 'OTP not found. Request again.' });
  if (Date.now() > stored.expires) { delete otpStore[email]; return res.status(400).json({ message: 'OTP expired. Request again.' }); }
  if (stored.otp !== otp) return res.status(400).json({ message: 'Invalid OTP. Try again.' });
  res.json({ message: 'OTP verified!' });
});

// Step 3 – Reset password
router.post('/reset-password', (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) return res.status(400).json({ message: 'Email and password required' });
  if (newPassword.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) return res.status(400).json({ message: 'Password must contain at least 1 special character' });
  const hashed = bcrypt.hashSync(newPassword, 10);
  db.query('UPDATE users SET password = ? WHERE email = ?', [hashed, email], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    delete otpStore[email];
    res.json({ message: 'Password reset successfully!' });
  });
});

// GET all customers
router.get('/customers', authMiddleware, (req, res) => {
  db.query(
    `SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at, u.is_active, r.name as restaurant_name 
     FROM users u 
     LEFT JOIN restaurants r ON u.restaurant_id = r.id
     ORDER BY u.created_at DESC`,
    (err, results) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(results);
    }
  );
});

// UPDATE waiter – name, email, phone, password (optional)
router.put('/customers/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { name, email, phone, password } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ message: 'Name, email and phone are required' });
  }

  if (password) {
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return res.status(400).json({ message: 'Password must contain at least 1 special character' });
    }
    const hashed = bcrypt.hashSync(password, 10);
    db.query(
      'UPDATE users SET name = ?, email = ?, phone = ?, password = ? WHERE id = ?',
      [name, email, phone, hashed, id],
      (err) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json({ message: 'Waiter updated successfully!' });
      }
    );
  } else {
    db.query(
      'UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?',
      [name, email, phone, id],
      (err) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json({ message: 'Waiter updated successfully!' });
      }
    );
  }
});

// TOGGLE active/inactive status
router.patch('/customers/:id/deactivate', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  db.query('UPDATE users SET is_active = ? WHERE id = ?', [is_active, id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: is_active ? 'User activated!' : 'User deactivated!' });
  });
});

// DELETE waiter permanently
router.delete('/customers/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM users WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: 'Waiter deleted successfully!' });
  });
});

// Super Admin Stats – with revenue ranking
router.get('/superadmin/stats', authMiddleware, (req, res) => {
  const stats = {};
  db.query('SELECT COUNT(*) as total FROM restaurants', (err, r) => {
    if (err) return res.status(500).json({ message: err.message });
    stats.total_restaurants = r[0].total;
    db.query('SELECT COUNT(*) as total FROM users', (err, r) => {
      stats.total_users = r[0].total;
      db.query('SELECT COUNT(*) as total FROM orders', (err, r) => {
        stats.total_orders = r[0].total;
        db.query('SELECT COALESCE(SUM(total),0) as revenue FROM orders', (err, r) => {
          stats.total_revenue = r[0].revenue;
          db.query(
            `SELECT r.id, r.name, r.status, r.created_at, 
              COUNT(DISTINCT u.id) as users, 
              COALESCE(SUM(o.total),0) as revenue
             FROM restaurants r 
             LEFT JOIN users u ON u.restaurant_id = r.id 
             LEFT JOIN orders o ON o.restaurant_id = r.id 
             GROUP BY r.id 
             ORDER BY revenue DESC`,
            (err, r) => {
              stats.recent_restaurants = r || [];
              db.query(
                'SELECT DATE(created_at) as date, COUNT(*) as count FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY date ASC',
                (err, r) => {
                  stats.weekly_orders = r || [];
                  db.query('SELECT status, COUNT(*) as count FROM orders GROUP BY status', (err, r) => {
                    stats.order_status = r || [];
                    res.json(stats);
                  });
                }
              );
            }
          );
        });
      });
    });
  });
});

module.exports = router;