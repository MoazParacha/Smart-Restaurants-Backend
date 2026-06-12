const express = require('express');
const router = express.Router();
const {
  getRestaurants, getRestaurant, createRestaurant,
  updateRestaurant, deleteRestaurant, updateRestaurantStatus
} = require('../controllers/restaurantController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, getRestaurants);
router.get('/:id', authMiddleware, getRestaurant);
router.post('/', authMiddleware, createRestaurant);
router.put('/:id', authMiddleware, updateRestaurant);
router.delete('/:id', authMiddleware, deleteRestaurant);
router.patch('/:id/status', authMiddleware, updateRestaurantStatus);

module.exports = router;