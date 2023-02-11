const mongoose = require('mongoose');
// user schema
const requestSchema = new mongoose.Schema(
    {
        request_id: {
            type: String
        },
        filename: {
            type: String
        },
        reason: {
            type: String
        },
        request_name: {
            type: String
        },
        request_uname: {
            type: String
        },
        request_time: {
            type: Date
        },
        content: {
            type: String
        },
        status: {
            type: String,
            default: 'pending'
        },
        denied_reason: {
            type: String
        },
        is_delete: {
            type: Boolean
        },
        mid: {
            type: String
        },
        mtime: {
            type: Date
        },
        note: {
            type: String
        }
    }
);

module.exports = mongoose.model('Request', requestSchema);
