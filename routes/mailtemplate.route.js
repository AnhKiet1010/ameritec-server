const express = require('express');
const router = express.Router();
const { checkAdmin } = require('../middlewares');

const {
    createMailTemplate,
    updateMailTemplate,
    deleteMailTemplate,
    detailMailTemplate,
    getListMailTemplate
} = require('../controllers/mailtemplate.controller');



router.post('/createMailTemplate', checkAdmin, createMailTemplate);
router.post('/updateMailTemplate', checkAdmin, updateMailTemplate);
router.post('/deleteMailTemplate', checkAdmin, deleteMailTemplate);
router.post('/detailMailTemplate', checkAdmin, detailMailTemplate);
router.post('/getListMailTemplate', checkAdmin, getListMailTemplate);


module.exports = router;