const db = require('../config/db');

const getOrders = (req, res) => {
  const { restaurantId } = req.params;
  db.query(
    `SELECT o.*, q.table_number 
     FROM orders o 
     LEFT JOIN qr_orders q ON q.order_id = o.id
     WHERE o.restaurant_id = ? 
     ORDER BY o.created_at DESC`,
    [restaurantId],
    (err, results) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(results);
    }
  );
};

const createOrder = (req, res) => {
  const { customer_name, total, restaurant_id, payment_method } = req.body;
  if (!total || !restaurant_id) {
    return res.status(400).json({ message: 'Total and restaurant_id required' });
  }
  db.query(
    'INSERT INTO orders (customer_name, total, restaurant_id, payment_method) VALUES (?, ?, ?, ?)',
    [customer_name, total, restaurant_id, payment_method || 'cash'],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      res.status(201).json({ message: 'Order created!', id: result.insertId });
    }
  );
};

const updateOrderStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatus = ['pending', 'preparing', 'ready', 'delivered'];
  if (!validStatus.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  db.query('UPDATE orders SET status = ? WHERE id = ?', [status, id], (err) => {
    if (err) return res.status(500).json({ message: err.message });

    // Agar delivered ho to table empty karo
    if (status === 'delivered') {
      db.query(
        `UPDATE restaurant_tables rt
         JOIN qr_orders qo ON qo.table_number = rt.table_number AND qo.restaurant_id = rt.restaurant_id
         SET rt.status = 'empty'
         WHERE qo.order_id = ?`,
        [id],
        (err) => {
          if (err) console.error('Table empty update error:', err);
        }
      );
    }
    res.json({ message: 'Order status updated!' });
  });
};

const deleteOrder = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM orders WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: 'Order deleted!' });
  });
};

const getDashboardStats = (req, res) => {
  const { restaurantId } = req.params;
  const stats = {};
  db.query(
    'SELECT COUNT(*) as total_orders FROM orders WHERE restaurant_id = ? AND DATE(created_at) = CURDATE()',
    [restaurantId],
    (err, results) => {
      if (err) return res.status(500).json({ message: err.message });
      stats.total_orders_today = results[0].total_orders;
      db.query(
        'SELECT COALESCE(SUM(total),0) as revenue FROM orders WHERE restaurant_id = ? AND DATE(created_at) = CURDATE()',
        [restaurantId],
        (err, results) => {
          if (err) return res.status(500).json({ message: err.message });
          stats.revenue_today = results[0].revenue || 0;
          db.query(
            'SELECT COUNT(*) as total_items FROM menu_items WHERE restaurant_id = ? AND is_active = 1',
            [restaurantId],
            (err, results) => {
              if (err) return res.status(500).json({ message: err.message });
              stats.total_menu_items = results[0].total_items;
              db.query(
                `SELECT DATE(created_at) as date, COUNT(*) as count 
                 FROM orders WHERE restaurant_id = ? 
                 AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                 GROUP BY DATE(created_at)`,
                [restaurantId],
                (err, results) => {
                  if (err) return res.status(500).json({ message: err.message });
                  stats.orders_this_week = results;
                  db.query(
                    'SELECT COUNT(*) as pending FROM orders WHERE restaurant_id = ? AND status = "pending"',
                    [restaurantId],
                    (err, results) => {
                      if (err) return res.status(500).json({ message: err.message });
                      stats.pending_orders = results[0].pending;
                      res.json(stats);
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
};

const getAnalytics = (req, res) => {
  const { restaurantId } = req.params;
  const { from, to } = req.query;
  const fromDate = from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const toDate = to || new Date().toISOString().split('T')[0];
  const analytics = {};

  db.query(
    `SELECT DATE(created_at) as date, COUNT(*) as orders, SUM(total) as revenue 
     FROM orders WHERE restaurant_id = ? AND DATE(created_at) BETWEEN ? AND ?
     GROUP BY DATE(created_at) ORDER BY date ASC`,
    [restaurantId, fromDate, toDate],
    (err, daily) => {
      if (err) return res.status(500).json({ message: err.message });
      analytics.daily = daily;
      db.query(
        `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as orders, SUM(total) as revenue
         FROM orders WHERE restaurant_id = ? AND DATE(created_at) BETWEEN ? AND ?
         GROUP BY month ORDER BY month ASC`,
        [restaurantId, fromDate, toDate],
        (err, monthly) => {
          if (err) return res.status(500).json({ message: err.message });
          analytics.monthly = monthly;
          db.query(
            `SELECT status, COUNT(*) as count FROM orders
             WHERE restaurant_id = ? AND DATE(created_at) BETWEEN ? AND ?
             GROUP BY status`,
            [restaurantId, fromDate, toDate],
            (err, statusData) => {
              if (err) return res.status(500).json({ message: err.message });
              analytics.status_breakdown = statusData;
              db.query(
                `SELECT m.name, COUNT(o.id) as total_orders
                 FROM orders o JOIN menu_items m ON m.restaurant_id = o.restaurant_id
                 WHERE o.restaurant_id = ? AND DATE(o.created_at) BETWEEN ? AND ?
                 GROUP BY m.name ORDER BY total_orders DESC LIMIT 5`,
                [restaurantId, fromDate, toDate],
                (err, topItems) => {
                  if (err) return res.status(500).json({ message: err.message });
                  analytics.top_items = topItems;
                  res.json(analytics);
                }
              );
            }
          );
        }
      );
    }
  );
};

module.exports = { getOrders, createOrder, updateOrderStatus, deleteOrder, getDashboardStats, getAnalytics };