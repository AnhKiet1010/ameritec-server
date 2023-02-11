const express = require('express');
const router = express.Router();

const {
    checkout,
    callback,
    cancel,
    payWithPaypal,
    successWatched,
    payWithCredit
} = require('../controllers/payment.controller');

router.post('/checkout', checkout);
router.post('/payWithPaypal', payWithPaypal);
router.post('/payWithCredit', payWithCredit);
router.post('/successWatched', successWatched);
router.get('/:gateway/callback', callback);
router.get('/cancel', cancel);

module.exports = router;