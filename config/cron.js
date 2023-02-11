const Transaction = require("../models/transaction.model");
const User = require("../models/user.model");
const moment = require("moment");
const fs = require('fs');
const { checkLevel, checkPoint, remindRenew1Mail, remindRenew2Mail } = require("../controllers/method");

// exports.deletePendingTransactions = async () => {
//     var listTrans = await Transaction.find({ status: "pending" }).exec();
//     listTrans.forEach(element => {
//         element.created_time = new Date(element.created_time);
//     });
//     const date = new Date();
//     var kq = [];
//     for (let i = 0; i < listTrans.length; i++) {
//         if (new Date(listTrans[i].created_time) < new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes() - 15)) {
//             kq.push(listTrans[i]._id);
//         }
//     }
//     await Transaction.deleteMany({ _id: kq }).exec();


//     fs.rmdir('.public/upload/TRASH', function (err) {
//         if (err) console.log(err);
//         // if no error, file has been deleted successfully
//         console.log('Delete trash CMND!');
//     });

//     console.log("finish deletePendingTransactions ");
//     //await Transaction.deleteMany({ status: "pending" }).exec();
// }

exports.setExpiredUser = async () => {

    var date_current = new Date();
    date_current.setHours("00");
    date_current.setMinutes("00");
    date_current.setSeconds("00");
    date_current.setMilliseconds("00");
    date_current.setDate(date_current.getDate() + 1);

    // 15 ngay nua--
    var date7 = new Date();
    date7.setHours("00");
    date7.setMinutes("00");
    date7.setSeconds("00");
    date7.setMilliseconds("00");
    date7.setDate(date7.getDate() + 16);


    // 7 ngay truoc
    var date_minus7 = new Date();
    date_minus7.setHours("00");
    date_minus7.setMinutes("00");
    date_minus7.setSeconds("00");
    date_minus7.setMilliseconds("00");
    date_minus7.setDate(date_minus7.getDate() - 6);


    const listExpiredUser = await User.find({
        $and: [
            { expired: false },
            { is_clone: false },
            { role: 'normal' },
            { expire_time: {$lt: date_minus7} }
        ]
    }).sort({ _id: -1 }).exec();

    console.log("listExpiredUser", listExpiredUser);

    if (listExpiredUser.length > 0) {
        for (let user of listExpiredUser) {
            await User.findOneAndUpdate({ _id: user._id }, { expired: true, active: false });
            await checkLevel(user.parent_id);
            await checkPoint(user.parent_id);
        }
    }

    const listExpiredUserClone = await User.find({
        $and: [
            { expired: false },
            { is_clone: true },
            { role: 'normal' },
            { expire_time: {$lt: date_minus7} }
        ]
    }).sort({ _id: -1 }).exec();

    console.log("listExpiredUserClone", listExpiredUserClone);

    if (listExpiredUserClone.length > 0) {
        for (let user of listExpiredUserClone) {
            await User.findOneAndUpdate({ _id: user._id }, { expired: true, active: false });
            await checkLevel(user.parent_id);
            await checkPoint(user.parent_id);
        }
    }

    const listRemind1User = await User.find({
        $and: [
            { expired: false },
            { is_clone: false },
            { role: 'normal' },
            { expire_time: date7 }
        ]
    }).sort({ _id: -1 }).exec();

    // console.log("listRemind1User", listRemind1User);

    const listRemind2User = await User.find({
        $and: [
            { expired: false },
            { is_clone: false },
            { role: 'normal' },
            { expire_time: date_current }
        ]
    }).sort({ _id: -1 }).exec();


    for (user of listRemind1User) {
        await remindRenew1Mail(user._id);
    }
    for (user of listRemind2User) {
        await remindRenew2Mail(user._id);
    }
}