const mongoose = require('mongoose');

// user schema
const bonusSchema = new mongoose.Schema(
  {
    receive_mem_id: {
      type: String
    },
    receive_mem_name: {
      type: String
    },
    status: {
      type: String,
      default: 'success'
    },
    created_time: {
      type: Date,
      default: new Date()
    },
    amount_vnd: {
      type: Number
    },
    amount_usd: {
      type: Number
    },
    amount_share: {
      type: Number
    },
    level: {
      type: String,
    },
    create_by: {
      type: String,
    },
    is_delete: {
      type: Boolean,
      default: false
    },
    mtime: {
      type: Date,
      default: new Date()
    },
    mid: {
      type: String
    },
    note: {
      type: String
    },
  }
);

module.exports = mongoose.model('Bonus', bonusSchema);
