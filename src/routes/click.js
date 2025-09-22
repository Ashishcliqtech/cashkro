const express = require('express');
const clickController = require('../controllers/clickController');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// The main tracking route. 
// optionalAuth is used because even non-logged-in users' clicks can be tracked, 
// though they won't be attributed until they log in/sign up.
router.post('/track', optionalAuth, clickController.trackClick);

// Admin route to view click data
router.get('/', protect, (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    clickController.getAllClicks(req, res, next);
});


module.exports = router;
