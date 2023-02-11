const express = require('express');
const router = express.Router();
const { checkAdmin, checkAccountant1, checkAccountant2 } = require('../middlewares');

const { activeTrans,
    changePaymentMethod,
    deleteTrans,
    getTransList
} = require('../controllers/trans.controller');


// tree system
router.get('/active/:id', checkAdmin, activeTrans);
router.post('/changePaymentMethod', checkAccountant1, changePaymentMethod);
router.post('/delete', checkAdmin, deleteTrans);
router.post('/getPendingList', checkAccountant2, getTransList);

module.exports = router;