const express = require('express');
const router = express.Router();

const {
    registerController,
    loginController,
    forgotPasswordController,
    resetPasswordController,
    checkLinkController,
    checkTransId,
    getPackageList
} = require('../controllers/auth.controller');
const upload = require('../middlewares/upload');


// auth route
router.post('/register',upload.fields([{ name: 'CMND_Front', maxCount: 1 }, { name: 'CMND_Back', maxCount: 1 }]), registerController);
router.post('/login', loginController);
router.post('/checkLink', checkLinkController);
router.post('/check-trans-id', checkTransId);
router.post('/getPackageList', getPackageList);

// forgot reset password
router.post('/forgotpassword', forgotPasswordController);
router.post('/resetpassword', resetPasswordController);

module.exports = router;