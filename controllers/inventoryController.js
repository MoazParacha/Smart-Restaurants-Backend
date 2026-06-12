const db = require('../config/db');

const getInventory = (req, res) => {
  const { restaurantId } = req.params;
  db.query(
    'SELECT * FROM inventory WHERE restaurant_id = ? ORDER BY name',
    [restaurantId],
    (err, results) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(results);
    }
  );
};

const createInventoryItem = (req, res) => {
  const { name, quantity, unit, min_level, restaurant_id } = req.body;
  if (!name || !restaurant_id) {
    return res.status(400).json({ message: 'Name and restaurant_id required' });
  }
  db.query(
    'INSERT INTO inventory (name, quantity, unit, min_level, restaurant_id) VALUES (?, ?, ?, ?, ?)',
    [name, quantity || 0, unit || 'pcs', min_level || 0, restaurant_id],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      res.status(201).json({ message: 'Item added!', id: result.insertId });
    }
  );
};

const updateInventoryItem = (req, res) => {
  const { id } = req.params;
  const { name, quantity, unit, min_level } = req.body;
  db.query(
    'UPDATE inventory SET name = ?, quantity = ?, unit = ?, min_level = ? WHERE id = ?',
    [name, quantity, unit, min_level, id],
    (err) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ message: 'Item updated!' });
    }
  );
};

const deleteInventoryItem = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM inventory WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: 'Item deleted!' });
  });
};

module.exports = { getInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem };