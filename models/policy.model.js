const mongoose = require('mongoose');
// user schema
const policySchema = new mongoose.Schema(
  {
    u_title: {
      type: String
    },
    title_vn: {
      type: String
    },
    text_vn: {
      type: String
    },
    title_en: {
      type: String
    },
    text_en: {
      type: String
    },
    cid: {
      type: String
    },
    cname: {
      type: String
    },
    ctime: {
      type: Date
    },
    mid: {
      type: String
    },
    mname: {
      type: String
    },
    mtime: {
      type: Date
    },
    type: { /* text or file */
      type: String
    },
    category: {
      type: String
    },
    filename: {
      type: String
    },
    filename_en: {
      type: String
    },
    read_id: {
      type: Array
    },
    is_delete: {
      type: Boolean,
      default: false
    },
    is_read: {
      type: Boolean
    }
  }
);

module.exports = mongoose.model('Policy', policySchema);
