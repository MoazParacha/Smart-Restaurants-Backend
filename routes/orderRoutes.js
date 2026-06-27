const express = require('express');
const router = express.Router();
const {
  getOrders,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  getDashboardStats,
  getAnalytics
} = require('../controllers/orderController');

const authMiddleware = require('../middleware/authMiddleware');

router.get('/dashboard/:restaurantId', authMiddleware, getDashboardStats);
router.get('/analytics/:restaurantId', authMiddleware, getAnalytics);
router.get('/:restaurantId', getOrders);
router.post('/', createOrder);
router.patch('/:id/status', authMiddleware, updateOrderStatus);
router.delete('/:id', authMiddleware, deleteOrder);

module.exports = router;
