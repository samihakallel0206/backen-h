//routes/call.route.js

const express = require('express');
const { 
    startCall,
    updateCall,
    getCallHistory
} = require('../controllers/call.controller');
const isAuth = require('../middleware/isAuth');

const router = express.Router();

router.post('/', isAuth, startCall);
router.put('/:id', isAuth, updateCall);
router.get('/history', isAuth, getCallHistory);

module.exports = router;