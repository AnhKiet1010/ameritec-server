const mongoose = require("mongoose");
// user schema
const userSchema = new mongoose.Schema({
  old_id: {
    type: String,
  },
  child_id: {
    type: String,
  },
  old_parent_id: {
    type: String,
  },
  email: {
    type: String,
  },
  full_name: {
    type: String,
  },
  uname: {
    type: String,
  },
  password: {
    type: String,
  },
  gender: {
    type: Number,
    default:1
  },
  birthday: {
    type: Date,
    default: new Date("1970,01,01"),
  },
  phone: {
    type: String,
    trim: true,
  },
  role: {
    type: String,
    default: "normal",
  },
  reset_password_link: {
    data: String,
    default: "",
  },
  avatar: {
    type: String,
    default:
      "https://robohash.org/maximeteneturdignissimos.jpg?size=100x100&set=set1",
  },
  buy_package: {
    type: String,
  },
  id_code: {
    type: String,
  },
  id_time: {
    type: Date,
  },
  issued_by: {
    type: String,
  },
  bank: {
    type: String,
  },
  bank_account: {
    type: String,
  },
  bank_name: {
    type: String,
  },
  cmndMT: {
    type: String,
  },
  cmndMS: {
    type: String,
  },
  tax_code: {
    type: String,
  },
  created_time: {
    type: Date,
    //default: new Date()
  },
  child1: {
    type: Object,
    default: {
      arr: [],
      countChild: 0,
      countPoint: 0,
    },
  },
  child2: {
    type: Object,
    default: {
      arr: [],
      countChild: 0,
      countPoint: 0,
    },
  },
  child3: {
    type: Object,
    default: {
      arr: [],
      countChild: 0,
      countPoint: 0,
    },
  },
  level: {
    type: Number,
    default: 0,
  },
  point: {
    type: Number,
    default: 0,
  },
  managed_by: {
    type: String,
  },
  group_number: {
    type: String,
  },
  parent_id: {
    type: String,
  },
  parent_name: {
    type: String,
    default: "",
  },
  expire_time: {
    type: Date,
  },
  level_up_time: {
    type: Date,
  },
  expired: {
    type: Boolean,
    default: false,
  },
  change_data_by: {
    type: String,
    default: "Not change",
  },
  note: {
    type: String,
    default: "",
  },
  is_clone: {
    type: Boolean,
  },
  active: {
    type: Boolean,
    default: true,
  },
  old_email: {
    type: Array,
    default: [],
  },
  is_delete: {
    type: Boolean,
    default: false,
  },
  delete_time: {
    type: Date,
    //default: null
  },
  is_partner: {
    type: Boolean,
    default: false,
  },
  account_type: {
    type: String,
    default: "vi", // vi : trong nước || en : nước ngoài
  },
  renew_date: {
    type: String,
    //default: new Date()
  },
  count_renew: {
    type: Number,
    default: 0,
  },
  state: {
    type: String,
  },
  ss: {
    type: String,
  },
  request_commission: {
    type: String,
  },
  drive_id: {
    type: String,
  },
  invite_user_id: {
    type: String,
  },
});

module.exports = mongoose.model("User", userSchema);
