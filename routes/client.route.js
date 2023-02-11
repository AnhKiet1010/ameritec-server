const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const { checkClient, check } = require('../middlewares');
const {
    dashboardTotalPoint,
    dashboardCountPackage,
    dashboardUserInfo,
    dashboard,
    tree,
    getChildInTree,
    profile,
    editProfile,
    inviteCode,
    receipts,
    getPolicyList,
    getPolicy,
    createRequest,
    getHeaderDashBoard,
    getRank500,
    createTransRenew
} = require('../controllers/client.controller');

const handleUpload = upload.single('file');

router.get('/:id', check, dashboard);
router.get('/dashboardTotalPoint/:id', check, dashboardTotalPoint);
router.get('/dashboardCountPackage/:id', check, dashboardCountPackage);
router.get('/dashboardUserInfo/:id', check, dashboardUserInfo);
router.post('/tree'/*, checkClient*/, tree);
router.post('/getChildInTree', checkClient, getChildInTree);
router.get('/profile/:id', checkClient, profile);
router.post('/profile/edit', upload.fields([{ name: 'CMND_Front', maxCount: 1 }, { name: 'CMND_Back', maxCount: 1 }]), editProfile);
router.get('/receipts/:id', checkClient, receipts);
router.post('/referral', checkClient, inviteCode);
router.post('/getHeaderDashBoard', check, getHeaderDashBoard);
router.post('/getRank500', check, getRank500);
router.post('/getPolicyList', checkClient, getPolicyList);
router.post('/getPolicy', checkClient, getPolicy);
router.post('/create-request', checkClient, function (req, res, next) {
    handleUpload(req, res, function (err) {
        if (err) {
            return res.json({
                status: 400,
                message: "file không hỗ trợ"
            })
        } else {
            next();
        }
    })
}, createRequest);
router.post('/requestRenew', checkClient, createTransRenew);

module.exports = router;