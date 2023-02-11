const express = require('express');
const router = express.Router();
const { checkAdmin, checkAccountant1, checkClient } = require('../middlewares');
const {
    getListRequest,
    countRequestUser,
    changeStatus,
    getListRequestByUserId,
    deleteRequest
} = require('../controllers/request.controller');


router.post('/getListRequest', checkAdmin, getListRequest);
router.get('/countRequestUser', checkAdmin, countRequestUser);
// router.post('/getDetailRequest', checkAccountant1, getDetailRequest);
router.post('/changeStatus', checkAccountant1, changeStatus);
router.post('/getListRequestByUserId', checkClient, getListRequestByUserId);
router.post('/deleteRequest', checkAdmin, deleteRequest);


module.exports = router;