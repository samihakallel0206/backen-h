//routes/activityView.route.js

const express = require('express');
const {
    getUnviewedActivities,
    checkActivityViewStatus,
    markActivityAsViewed
} = require('../controllers/activityViewController');
const isAuth = require('../middleware/isAuth');

const router = express.Router();

router.get('/unviewed', isAuth, getUnviewedActivities);
router.get('/:activityId/view-status', isAuth, checkActivityViewStatus);
router.post('/:activityId/mark-viewed', isAuth, markActivityAsViewed);

module.exports = router;