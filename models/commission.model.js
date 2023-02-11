const mongoose = require('mongoose');
// user schema
const comSchema = new mongoose.Schema(
    {
        trans_id: {
            type: String
        },
        join_mem_id: {
            type: String
        },
        receive_mem_id: {
            type: String
        },
        join_mem_name: {
            type: String
        },
        join_mem_uname: {
            type: String
        },
        receive_mem_name: {
            type: String
        },
        receive_mem_uname: {
            type: String
        },
        status: {
            type: String,
            default: 'pending'
        },
        created_time: {
            type: Date
        },
        amount_vnd: {
            type: Number
        },
        amount_usd: {
            type: Number
        },
        payment_method: {
            type: String
        },
        approved_by: {
            type: String
        },
        approved_time: {
            type: Date
        },
        qualified: {
            type: Boolean,
            default: false
        },
        bank_account: {
            type: String,
        },
        bank: {
            type: String,
        },
        bank_name: {
            type: String,
        },
        mtime: {
            type: Date
        },
        mid: {
            type: String
        },
        buy_package: {
            type: String
        },
        note: {
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
        is_renew: {
            type: Boolean,
            default: false
        },
        account_type: {
            type: String,
            default: 'vi' // vi : trong nước || en : nước ngoài
        },
        email: {
            type: String
        },
        ref_code: {
            type: String,
            default: ""
        }
    }
);

module.exports = mongoose.model('Commission', comSchema);
