const mongoose = require('mongoose');
// user schema
const packageSchema = new mongoose.Schema(
  {
    sid: {
      type: String
    },
    name: {
      type: String
    },
    name_en: {
      type: String
    },
    price_vnd: {
      type: Number
    },
    price_usd: {
      type: Number
    },
    commission: {
      type: Object
    },
    ctime: {
      type: Date
    },
    mtime: {
      type: Date
    },
    cid: {
      type: String
    },
    mid: {
      type: String
    },
    active: {
      type: Boolean
    }
  }
);

module.exports = mongoose.model('Package', packageSchema);
