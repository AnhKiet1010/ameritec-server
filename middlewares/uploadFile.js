
const multer = require('multer');

// UPLOAD IMAGE
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/uploads/trash');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
});

var upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        // if (
        //     file.mimetype == "application/pdf" ||
        //     file.mimetype == "application/msword" ||
        //     file.mimetype == "application/vnd.openxmlformatsofficedocument.wordprocessingml.document"
        // ) {
            cb(null, true);
        // } else {
        //     return cb(new Error("File are'n allowed!"));
        // }
    }
});

module.exports =  upload;