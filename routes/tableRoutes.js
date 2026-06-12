const express = require('express');
const router = express.Router();
const {
  getTables,
  createTable,
  updateTable,
  deleteTable,
  getPublicMenu,
  placeQrOrder
} = require('../controllers/tableController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes PEHLE (no auth)
router.get('/public/menu/:restaurantId', getPublicMenu);
router.post('/public/order', placeQrOrder);

// Admin routes (auth required)
router.get('/:restaurantId', authMiddleware, getTables);
router.post('/', authMiddleware, createTable);
router.put('/:id', authMiddleware, updateTable);
router.delete('/:id', authMiddleware, deleteTable);

module.exports = router;