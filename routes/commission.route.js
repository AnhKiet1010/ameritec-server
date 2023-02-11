const express = require('express');
const router = express.Router();
const { checkAccountant1, checkAccountant2 } = require('../middlewares');
const {
    getListCommission,
    getDetailCommission,
    updateReceiveMemId,
    changeStatus,
    returnCommissionNL,
    checkCashOutStatusNL
} = require('../controllers/commission.controller');



router.post('/getListCommission', checkAccountant2, getListCommission);
router.post('/getDetailCommission', checkAccountant2, getDetailCommission);
router.post('/updateReceiveMemId', checkAccountant2, updateReceiveMemId);
router.post('/changeStatus', checkAccountant2, changeStatus);
router.post('/returnCommissionNL', checkAccountant2, returnCommissionNL);
router.post('/checkCashOutStatusNL', checkAccountant2, checkCashOutStatusNL);


module.exports = router;