const db = require('../config/db');
const QRCode = require('qrcode');

const getTables = (req, res) => {
  const { restaurantId } = req.params;
  db.query(
    'SELECT * FROM restaurant_tables WHERE restaurant_id = ? ORDER BY table_number',
    [restaurantId],
    (err, results) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(results);
    }
  );
};

const createTable = async (req, res) => {
  const { table_number, capacity, location, restaurant_id } = req.body;
  if (!table_number || !restaurant_id) {
    return res.status(400).json({ message: 'table_number and restaurant_id required' });
  }
  try {
    const menuUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/public-menu/${restaurant_id}/${table_number}`;
    const qrCodeDataUrl = await QRCode.toDataURL(menuUrl, {
      width: 300, margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' }
    });
    db.query(
      'INSERT INTO restaurant_tables (table_number, table_name, capacity, location, qr_code, restaurant_id) VALUES (?, ?, ?, ?, ?, ?)',
      [table_number, `Table ${table_number}`, capacity || 4, location || null, qrCodeDataUrl, restaurant_id],
      (err, result) => {
        if (err) return res.status(500).json({ message: err.message });
        res.status(201).json({ message: 'Table created!', id: result.insertId, qr_code: qrCodeDataUrl, menu_url: menuUrl });
      }
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateTable = async (req, res) => {
  const { id } = req.params;
  const { table_number, capacity, location, restaurant_id, status } = req.body;
  try {
    const menuUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/public-menu/${restaurant_id}/${table_number}`;
    const qrCodeDataUrl = await QRCode.toDataURL(menuUrl, {
      width: 300, margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' }
    });
    db.query(
      'UPDATE restaurant_tables SET table_number = ?, table_name = ?, capacity = ?, location = ?, qr_code = ?, status = ? WHERE id = ?',
      [table_number, `Table ${table_number}`, capacity || 4, location || null, qrCodeDataUrl, status || 'empty', id],
      (err) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json({ message: 'Table updated!', qr_code: qrCodeDataUrl });
      }
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteTable = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM restaurant_tables WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: 'Table deleted!' });
  });
};

const getPublicMenu = (req, res) => {
  const { restaurantId } = req.params;
  db.query(
    `SELECT m.*, r.name as restaurant_name, r.logo 
     FROM menu_items m 
     JOIN restaurants r ON r.id = m.restaurant_id
     WHERE m.restaurant_id = ? AND m.is_active = 1 
     ORDER BY m.category, m.name`,
    [restaurantId],
    (err, results) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(results);
    }
  );
};

const placeQrOrder = (req, res) => {
  console.log('QR Order received:', req.body);
  const { customer_name, table_number, table_id, restaurant_id, total } = req.body;

  if (!restaurant_id || !table_number) {
    return res.status(400).json({ message: 'restaurant_id and table_number required' });
  }

  db.query(
    'INSERT INTO orders (customer_name, total, restaurant_id, status, payment_method) VALUES (?, ?, ?, ?, ?)',
    [
      customer_name || `Table ${table_number}`,
      parseFloat(total) || 0,
      parseInt(restaurant_id),
      'pending',
      'cash'
    ],
    (err, orderResult) => {
      if (err) {
        console.error('Order insert error:', err);
        return res.status(500).json({ message: err.message });
      }
      const order_id = orderResult.insertId;
      db.query(
        'INSERT INTO qr_orders (order_id, table_id, table_number, customer_name, restaurant_id) VALUES (?, ?, ?, ?, ?)',
        [order_id, table_id || null, table_number, customer_name || `Table ${table_number}`, parseInt(restaurant_id)],
        (err) => {
          if (err) {
            console.error('QR order insert error:', err);
            return res.status(500).json({ message: err.message });
          }
          // Table status occupied karo
          db.query(
            'UPDATE restaurant_tables SET status = ? WHERE restaurant_id = ? AND table_number = ?',
            ['occupied', parseInt(restaurant_id), table_number],
            (err) => {
              if (err) console.error('Table status update error:', err);
            }
          );
          res.status(201).json({ message: 'Order placed!', order_id, table_number });
        }
      );
    }
  );
};

module.exports = { getTables, createTable, updateTable, deleteTable, getPublicMenu, placeQrOrder };