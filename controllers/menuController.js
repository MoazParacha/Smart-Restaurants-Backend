const db = require('../config/db');

const getMenuItems = (req, res) => {
  const { restaurantId } = req.params;
  db.query(
    'SELECT * FROM menu_items WHERE restaurant_id = ? AND is_active = 1 ORDER BY category, name',
    [restaurantId],
    (err, results) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(results);
    }
  );
};

const createMenuItem = (req, res) => {
  const { name, price, category, image_url, restaurant_id, discount_percent, discount_from, discount_to, actual_price } = req.body;
  if (!name || !price || !restaurant_id) {
    return res.status(400).json({ message: 'Name, price and restaurant_id required' });
  }
  db.query(
    'INSERT INTO menu_items (name, price, category, image_url, restaurant_id, discount_percent, discount_from, discount_to, actual_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [name, price, category, image_url, restaurant_id, discount_percent || 0, discount_from || null, discount_to || null, actual_price || price],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      res.status(201).json({ message: 'Menu item created!', id: result.insertId });
    }
  );
};

const updateMenuItem = (req, res) => {
  const { id } = req.params;
  const { name, price, category, image_url, discount_percent, discount_from, discount_to, actual_price } = req.body;
  db.query(
    'UPDATE menu_items SET name = ?, price = ?, category = ?, image_url = ?, discount_percent = ?, discount_from = ?, discount_to = ?, actual_price = ? WHERE id = ?',
    [name, price, category, image_url, discount_percent || 0, discount_from || null, discount_to || null,actual_price || price, id],
    (err) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ message: 'Menu item updated!' });
    }
  );
};

const deleteMenuItem = (req, res) => {
  const { id } = req.params;
  db.query('UPDATE menu_items SET is_active = 0 WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: 'Menu item deleted!' });
  });
};

module.exports = { getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem };