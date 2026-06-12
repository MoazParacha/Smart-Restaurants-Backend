const express = require('express');
const router = express.Router();
const {
  getInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem
} = require('../controllers/inventoryController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/:restaurantId', authMiddleware, getInventory);
router.post('/', authMiddleware, createInventoryItem);
router.put('/:id', authMiddleware, updateInventoryItem);
router.delete('/:id', authMiddleware, deleteInventoryItem);

module.exports = router;