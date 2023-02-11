const mongoose = require('mongoose');
// user schema
const activation = new mongoose.Schema(
    {
        email: {
            type: String
        },
        order: {
            type: Number
        },
        linkId: {
            type: String
        },
        user_id: {
            type: String
        },
        accountId: {
            type: String
        },
        groupId: {
            type: String
        },
        firstName: {
            type: String
        },
        lastName: {
            type: String
        },
        activationLimit: {
            type: String
        },
        activationCount: {
            type: String
        },
        licenseJwt: {
            type: String
        },
        shortToken: {
            type: String
        },
        created: {
            type: Date
        },
        modified: {
            type: String
        },
        is_delete: {
            type: Boolean,
            default: false
        },
        delete_time: {
            type: Date,
            default: new Date()
        },
    }
);

module.exports = mongoose.model('Activation', activation);