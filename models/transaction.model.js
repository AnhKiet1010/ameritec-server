const mongoose = require('mongoose');
// user schema
const tranSchema = new mongoose.Schema(
  {
    token: {
      type: String
    },
    status: {
      type: String,
      default: 'pending'
    },
    created_time: {
      type: Date,
      default: new Date()
    },
    approved_by: {
      type: String
    },
    approved_time: {
      type: Date
    },
    user_id: {
      type: String
    },
    user_name: {
      type: String
    },
    user_uname: {
      type: String
    },
    invite_id: {
      type: String
    },
    invite_name: {
      type: String
    },
    invite_uname: {
      type: String
    },
    email: {
      type: String
    },
    payment_method: {
      type: String,
      default: ''
    },
    phone: {
      type: String
    },
    buy_package: {
      type: String
    },
    expired_time: {
      type: Date
    },
    orderId: {
      type: String
    },
    amount_vnd: {
      type: Number
    },
    amount_usd: {
      type: Number
    },
    mtime: {
      type: Date
    },
    mid: {
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
      default: false,
    },
    watched_success: {
      type: Boolean,
      default: false,
    },
    account_type: {
      type: String,
      default: 'vi' // vi : trong nước || en : nước ngoài
    },
  }
);

module.exports = mongoose.model('Transaction', tranSchema);
