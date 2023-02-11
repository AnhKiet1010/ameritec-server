const express = require('express');
const router = express.Router();
const { checkAdmin, checkAccountant1 } = require('../middlewares');

const {
    createBonus,
    deleteBonus,
    getUser,
    getListBonusByUserId
} = require('../controllers/bonus.controller');


// tree system
router.post('/request-user', checkAccountant1, getUser);
router.post('/createBonus', checkAccountant1, createBonus);
router.post('/deleteBonus', checkAccountant1, deleteBonus);
router.post('/getListBonusByUserId', checkAccountant1, getListBonusByUserId);


module.exports = router;