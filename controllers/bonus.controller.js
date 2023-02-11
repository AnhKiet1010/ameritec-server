const Bonus = require("../models/bonus.model");
const User = require("../models/user.model");

exports.getUser = async (req, res) => {
    const { id } = req.body;
    const user = await User.findOne({ _id: id, is_delete: false }).exec();

    res.json({
        status: 200,
        data: {
            user
        },
        errors: [],
        message: ""
    });
}

exports.createBonus = async (req, res) => {
    const {
        receive_mem_id,
        receive_mem_name,
        level,
        amount_vnd,
        amount_usd,
        amount_share,
        note
    } = req.body;
    
    var newBonus = new Bonus({
        receive_mem_id,
        receive_mem_name,
        level,
        amount_vnd,
        amount_usd,
        create_by: req.id_admin,
        note,
        amount_share,
        created_time: new Date(),
    });
    await newBonus.save();
    res.json({
        status: 200,
        data: {},
        errors: [],
        message: "Đã tạo thưởng thành công"
    });
}

exports.deleteBonus = async (req, res) => {
    const id = req.body.id;
    await Bonus.findOneAndUpdate({ _id: id}, {is_delete: true, mid: req.id_admin, mtime: new Date}).exec();
    return res.json({
      status: 200,
      message: "Đã xóa thưởng",
      errors: [],
    });
  }

exports.getListBonusByUserId = async (req, res) => {
    const { id } = req.body;
    var listBonus = [];
  
      listBonus = await Bonus.find({$and: [{receive_mem_id: id}, {is_delete: false}]}).sort({_id: -1}).exec();
  
    res.json({
      status: 200,
      data: {
        listBonus
      },
      message: "",
      errors: [],
    });
  }