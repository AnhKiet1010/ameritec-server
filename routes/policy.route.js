const express = require('express');
const router = express.Router();
const uploadFile = require('../middlewares/uploadFile');
const { check , checkAdmin } = require('../middlewares');


const {
    createPolicy,
    getPolicyList,
    deletePolicy,
    getPolicy,
    editPolicy
} = require('../controllers/policy.controller');

router.post('/createPolicy', uploadFile.fields([{ name: 'file', maxCount: 1 }, , { name: 'file_en', maxCount: 1 }]), checkAdmin, createPolicy);
router.post('/getPolicyList', check, getPolicyList);
router.post('/deletePolicy', checkAdmin, deletePolicy);
router.post('/getPolicy', checkAdmin, getPolicy);
router.post('/editPolicy', uploadFile.fields([{ name: 'file', maxCount: 1 }, , { name: 'file_en', maxCount: 1 }]), checkAdmin, editPolicy);

module.exports = router;