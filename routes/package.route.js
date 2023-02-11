const express = require('express');
const router = express.Router();

const { checkAdmin } = require('../middlewares');

const {
    getListPackage,
    getDetailPackage,
    updatePackage,
    createPackage,
    deletePackage
} = require('../controllers/package.controller');

router.post('/getListPackage', checkAdmin, getListPackage);
router.post('/getDetailPackage', checkAdmin, getDetailPackage);
router.post('/updatePackage', checkAdmin, updatePackage);
router.post('/createPackage', checkAdmin, createPackage);
router.post('/deletePackage', checkAdmin, deletePackage);

module.exports = router;