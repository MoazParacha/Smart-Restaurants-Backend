const db = require('../config/db');

const getRestaurants = (req, res) => {
  db.query(
    `SELECT r.*, u.name as owner_name, u.email 
     FROM restaurants r 
     LEFT JOIN users u ON u.restaurant_id = r.id AND u.role = 'restaurant_admin'
     ORDER BY r.created_at DESC`,
    (err, results) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(results);
    }
  );
};

const getRestaurant = (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM restaurants WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    if (results.length === 0) return res.status(404).json({ message: 'Restaurant not found' });
    res.json(results[0]);
  });
};

const createRestaurant = (req, res) => {
  const { name, logo, tenant_id } = req.body;
  if (!name || !tenant_id) return res.status(400).json({ message: 'Name and tenant_id required' });
  db.query(
    'INSERT INTO restaurants (name, logo, tenant_id) VALUES (?, ?, ?)',
    [name, logo, tenant_id],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      res.status(201).json({ message: 'Restaurant created!', id: result.insertId });
    }
  );
};

const updateRestaurant = (req, res) => {
  const { id } = req.params;
  const { name, logo } = req.body;
  db.query('UPDATE restaurants SET name = ?, logo = ? WHERE id = ?', [name, logo, id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: 'Restaurant updated!' });
  });
};

const deleteRestaurant = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM restaurants WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: 'Restaurant deleted!' });
  });
};

const updateRestaurantStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  db.query('UPDATE restaurants SET status = ? WHERE id = ?', [status, id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: `Restaurant ${status}!` });
  });
};

module.exports = { getRestaurants, getRestaurant, createRestaurant, updateRestaurant, deleteRestaurant, updateRestaurantStatus };