const express = require('express');
const router = express.Router();

const { checkAdmin, checkAccountant1, checkAccountant2, checkSystem } = require('../middlewares');

const {
    getDashboard,
    getRank,
    getUsers,
    countPendingTransList,
    getTree,
    getTreeChildById,
    editTree,
    getUser,
    getExportListChildData,
    getStorage,
    createAdmin,
    getListAdmin,
    deleteAdmin,
    createUser,
    deleteUser,
    editUser,
    blockUser,
    unBlockUser,

    renderAvatar,
    renderUser,
    renderTree,
    deleteOutUser,
    helperInsertCallLevel,
    updateGroupNumber,
    updatePassword,
    createCloneAcc,
    updateCloneToBuyPackage3,
    calPointLevelAllUser,
    calPointLevel,
    deleteUserIsClone,
    updateTree,
    updateRole,
    updateLevelUpdateEmpty,
    convertDateToISO,
    testSendMail,
    convertsFullToUName,
    test,
    updateIsDelete,
    deleteTrashUser,
    getListDeleteUser,
    testMail,
    getNewActiveLink,
    renewLicense,
    updateAccountType,
    deleteStorage,
    uploadImageCK,
    checkExpired,
    changeDate,
    moveToChildOfParent,
    changeAvatar,
    updateCommissionToSuccess,
    testN,
    setIsCloneAcc,
    checkChildPoint,
    calChildPointAll
} = require('../controllers/admin.controller');
const upload = require('../middlewares/upload');


router.post('/upload', upload.single('file'), uploadImageCK);
router.get('/dashboard', checkSystem, getDashboard);
router.get('/rank', checkSystem, getRank);
router.post('/users', checkAccountant2, getUsers);
router.post('/storage', checkAccountant1, getStorage);
router.post('/deleteStorage', checkAdmin, deleteStorage);
router.get('/user/:id', checkAccountant2, getUser);
router.post('/getExportListChildData', checkAccountant1, getExportListChildData);
router.post('/user/edit/:id', upload.fields([{ name: 'CMND_Front', maxCount: 1 }, { name: 'CMND_Back', maxCount: 1 }]), checkAdmin, editUser);

router.get('/getCountPendingList', checkAdmin, countPendingTransList);
router.post('/tree',
    checkSystem,
    getTree);
router.post('/getTreeChildById',
    //  checkSystem, 
    getTreeChildById);
router.post('/edit-tree', checkAdmin, editTree);

router.post('/create-admin', checkAdmin, createAdmin);
router.post('/get-list-admin', checkAdmin, getListAdmin);
router.post('/delete-admin', checkAdmin, deleteAdmin);
router.post('/create-user', checkAdmin, createUser);
router.post('/delete', checkAdmin, deleteUser);
router.post('/blockUser', blockUser);
router.post('/unblockUser', unBlockUser);

router.post('/recal', calPointLevelAllUser);
router.post('/recalChildPoint', calChildPointAll);
router.post('/recal/:id', calPointLevel);

router.post('/updateGroupNumber', updateGroupNumber);
router.post('/renderTree', renderTree);
router.post('/changeDate', changeDate);
router.post('/renderUser', renderUser);
router.post('/renderAvatar', renderAvatar);
router.post('/deleteOutUser', deleteOutUser);
router.post('/updateCloneToBuyPackage3', updateCloneToBuyPackage3);
router.post('/helperInsertCallLevel', helperInsertCallLevel);
router.post('/updatePassword', updatePassword);
router.post('/createCloneAcc', createCloneAcc);
router.post('/moveToChildOfParent', moveToChildOfParent);
router.post('/deleteUserIsClone', deleteUserIsClone);
router.post('/updateTree', updateTree);
router.post('/updateRole', updateRole);
router.post('/updateLevelUpdateEmpty', updateLevelUpdateEmpty);
router.post('/convertDateToISO', convertDateToISO);
router.post('/testSendMail', testSendMail);
router.post('/convertsFullToUName', convertsFullToUName);
router.post('/updateAccountType', updateAccountType);
router.post('/setIsCloneAcc', setIsCloneAcc);
router.post('/test', test);
router.post('/testMail', testMail);
router.post('/checkExpired', checkExpired);
router.post('/updateIsDelete', updateIsDelete);
router.post('/deleteTrashUser', checkAdmin, deleteTrashUser);
router.post('/getListDeleteUser', getListDeleteUser);
router.post('/getNewActiveLink', checkAdmin, getNewActiveLink);
router.post('/renewLicense', checkAdmin, renewLicense);
router.post('/changeAvatar', changeAvatar);
router.post('/updateCommissionToSuccess', updateCommissionToSuccess);

router.get('/testN', testN);
router.get('/checkChildPoint/:id', checkChildPoint);
module.exports = router;