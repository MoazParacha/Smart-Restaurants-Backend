const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// REGISTER
const register = (req, res) => {
  const { name, email, password, role, restaurant_name, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return res.status(400).json({ message: 'Password must contain at least 1 special character' });
  }

  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    if (results.length > 0) return res.status(400).json({ message: 'Email already exists' });

    const hashedPassword = bcrypt.hashSync(password, 10);
    const assignedRole = role || 'restaurant_admin';

    if (assignedRole === 'restaurant_admin') {
      const restName = restaurant_name || `${name}'s Restaurant`;
      const tenant_id = `tenant_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      db.query(
        'INSERT INTO restaurants (name, tenant_id, email) VALUES (?, ?, ?)',
        [restName, tenant_id, email],
        (err, restaurantResult) => {
          if (err) return res.status(500).json({ message: err.message });
          const restaurant_id = restaurantResult.insertId;
          db.query(
            'INSERT INTO users (name, email, password, role, restaurant_id, phone) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, hashedPassword, assignedRole, restaurant_id, phone || null],
            (err) => {
              if (err) return res.status(500).json({ message: err.message });
              res.status(201).json({ message: 'Account created! Your restaurant is ready.', restaurant_name: restName });
            }
          );
        }
      );
    } else if (assignedRole === 'waiter') {
      // Waiter — restaurant_id required
      const { restaurant_id } = req.body;
      if (!restaurant_id) return res.status(400).json({ message: 'restaurant_id required for waiter' });
      db.query(
        'INSERT INTO users (name, email, password, role, restaurant_id, phone) VALUES (?, ?, ?, ?, ?, ?)',
        [name, email, hashedPassword, 'waiter', restaurant_id, phone || null],
        (err) => {
          if (err) return res.status(500).json({ message: err.message });
          res.status(201).json({ message: 'Waiter account created!' });
        }
      );
    } else {
      db.query(
        'INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
        [name, email, hashedPassword, assignedRole, phone || null],
        (err) => {
          if (err) return res.status(500).json({ message: err.message });
          res.status(201).json({ message: 'User registered successfully!' });
        }
      );
    }
  });
};

// LOGIN
const login = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'All fields required' });

  db.query(
    'SELECT u.id, u.name, u.email, u.password, u.role, u.restaurant_id, r.name as restaurant_name FROM users u LEFT JOIN restaurants r ON u.restaurant_id = r.id WHERE u.email = ?',
    [email],
    (err, results) => {
      if (err) return res.status(500).json({ message: err.message });
      if (results.length === 0) return res.status(400).json({ message: 'User not found' });

      const user = results[0];
      const isMatch = bcrypt.compareSync(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Wrong password' });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, restaurant_id: user.restaurant_id, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login successful!',
        token,
        user: {
          id: user.id, name: user.name, email: user.email,
          role: user.role, restaurant_id: user.restaurant_id,
          restaurant_name: user.restaurant_name
        }
      });
    }
  );
};

module.exports = { register, login };