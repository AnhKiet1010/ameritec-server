const {
  checkoutNganLuong,
  callbackNganLuong,
} = require("./nganluong-handlers");
const User = require("../models/user.model");
const Transaction = require("../models/transaction.model");
const Tree = require("../models/tree.model");
const Commission = require("../models/commission.model");
const Activation = require("../models/activation.model");
const Package = require("../models/package.model");
const fs = require('fs');
const { 
  checkChildPoint,
  levelUpMail, 
  thankMail, 
  successMail,
  renewSuccess,
  getActiveLink,
  returnCommission,
  createCloneBuyPackage3, 
  createCloneBuyPackage4, 
  updateParent, checkLevel, 
  checkPoint, 
  remindRenew1Mail, 
  remindRenew2Mail, 
  reciveCommissonMail,
  paymentSuccessMail, 
  removeAccents } = require("./method");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const bcrypt = require("bcrypt");
const https = require('https');
const querystring = require('querystring');

const saltRounds = 10;

const countTotalChildMemberForLevel = async (
  subTreeIdList,
  countLevel,
  level
) => {
  var count = 0;
  for (let id of subTreeIdList) {
    let branchObject = await Tree.findOne({ parent: id })
      .select("buy_package")
      .exec();
    if (branchObject.buy_package !== "1") {
      count++;
    }
  }

  if (countLevel === level) {
    return count;
  } else {
    for (let i = 0; i < subTreeIdList.length; i++) {
      let branchObject = await Tree.findOne({ parent: subTreeIdList[i]._id })
        .select("group1 group2 group3 buy_package")
        .exec();

      if (branchObject) {
        let group = [
          ...branchObject.group1,
          ...branchObject.group2,
          ...branchObject.group3,
        ];
        if (group.length !== 0 && branchObject.buy_package !== "1") {
          count += await countTotalChildMemberForLevel(
            group,
            countLevel++,
            level
          );
        } else {
          return count;
        }
      } else {
        continue;
      }
    }
  }
};

exports.checkout = async (req, res) => {
  console.log(req.body);
  const { id, payment_method, bank_code } = req.body;
  if (payment_method === "nganluong" || payment_method === "nganluongvisa") {

    const trans = await Transaction.findOne({ _id: id }).exec();

    const params = trans;


    const clientIp =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection.socket ? req.connection.socket.remoteAddress : null);

    const amount = parseInt(params.amount_vnd.toString().replace(/,/g, ""), 10);
    const now = new Date();

    // NOTE: only set the common required fields and optional fields from all gateways here, redundant fields will invalidate the payload schema checker
    const checkoutData = {
      amount,
      customerName: params.user_name,
      clientIp: clientIp.length > 15 ? "127.0.0.1" : clientIp,
      locale: "vn",
      billingCity: params.city || "",
      billingStateProvince: params.district || "",
      billingCountry: params.country || "",
      billingStreet: params.address || "",
      currency: "VND",
      customerEmail: params.email,
      customerPhone: params.phone,
      orderId: `Ameritec-${now.toISOString()}`,
      transactionId: `Ameritec-${now.toISOString()}`, // same as orderId (we don't have retry mechanism)
      customerId: params.email,
    };

    // pass checkoutData to gateway middleware via res.locals
    res.locals.checkoutData = checkoutData;

    // Note: these handler are asynchronous
    let asyncCheckout = null;
    switch (payment_method) {
      case "nganluong":
        // this param is not expected in other gateway
        checkoutData.customerName = `${params.name}`.trim();
        checkoutData.paymentMethod = "ATM_ONLINE";
        checkoutData.bankCode = bank_code;
        asyncCheckout = checkoutNganLuong(req, res);
        break;
      case "nganluongvisa":
        // this param is not expected in other gateway
        checkoutData.customerName = `${params.name}`.trim();
        checkoutData.paymentMethod = "VISA";
        asyncCheckout = checkoutNganLuong(req, res);
        break;
      default:
        break;
    }

    if (asyncCheckout) {
      asyncCheckout
        .then(async (checkoutUrl) => {
          console.log('checkoutUrl', checkoutUrl);
          await Transaction.findOneAndUpdate(
            { _id: id },
            { payment_method }
          ).exec();
          res.json({
            status: 200,
            data: {
              checkoutUrl: checkoutUrl.href,
              payment_method
            }
          });
        })
        .catch((err) => {
          console.log('error', err);
          res.send(err.message);
        });
    } else {
      console.log("build checkout bị lỗi");

      res.json({
        status: 301,
        message: "Payment method not found",
        data: {
          payment_method,
        },
        errors: [],
      });
    }
  } else if (payment_method === "tienmat") {
    await Transaction.findOneAndUpdate(
      { _id: id },
      { payment_method: "tienmat" }
    ).exec();
    res.json({
      status: 200,
      data: {
        payment_method,
      },
      message: "Trả bằng tiền mặt",
      errors: [],
    });
  }
};

async function processDataActivation(data, token, trans_id, orderId) {
  var datenow = new Date();
  const {
    full_name,
    email,
    password,
    phone,
    id_code,
    issued_by,
    bank_account,
    bank,
    bank_name,
    tax_code,
    birthday,
    gender,
    invite_code,
    donate_sales_id,
    group_number,
    buy_package,
    id_time,
    is_partner,
    account_type,
    cmndMT,
    cmndMS,
    state,
    ss,
    request_commission,
    drive_id
  } = data;
  var user_check = await User.findOne({ email }).exec();
  if (user_check) {
    return "Đã tồn tại user";
  }
  const unSavedErr = [];

  bcrypt.genSalt(saltRounds, function (err, salt) {
    bcrypt.hash(password, salt, async function (err, hash) {

      // --------------- CREATE AVATAR -------------------
      const listCharacterOfName = full_name.split(" ");
      const avatarKey = `${listCharacterOfName[listCharacterOfName.length - 2]}+${listCharacterOfName[listCharacterOfName.length - 1]}`;

      // --------------- SAVE USER -------------------
      var level = 0;
      var point = 0;
      switch (buy_package) {
        case "1":
          point = 0.25;
          break;
        case "2":
          point = 1;
          break;
        case "3":
          point = 10;
          level = 1;
          break;
        case "4":
          point = 4;
          break;
      }

      let now = new Date();
      let datenow = new Date().setHours(0, 0, 0, 0);
      let expired = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).setHours(0, 0, 0, 0);

      const user = new User({
        full_name: full_name.toUpperCase(),
        email,
        password: hash,
        avatar: `https://ui-avatars.com/api/?name=${avatarKey}&?background=596D79&color=fff`,
        phone,
        buy_package,
        group_number,
        parent_id: donate_sales_id,
        created_time: new Date(datenow).toISOString(),
        expire_time: new Date(expired).toISOString(),
        id_code,
        issued_by,
        bank,
        bank_account,
        point: point,
        level: level,
        level_up_time: level === 1 ? new Date() : "",
        bank_name,
        tax_code,
        birthday: birthday ? new Date(birthday).toISOString() : new Date(0).toISOString(),
        gender,
        id_time: id_time ? new Date(id_time).toISOString() : new Date(0).toISOString(),
        expired: false,
        is_clone: false,
        uname: removeAccents(full_name.toUpperCase()),
        is_partner,
        account_type,
        cmndMT,
        cmndMS,
        state,
        ss,
        request_commission,
        drive_id,
        invite_user_id: invite_code
      });

      await user.save();
      if (user.level !== 0) {
        await levelUpMail(user._id)
      }

      // --------------- FIND DONATE USER -------------------
      if (invite_code !== process.env.INVITE_CODE) {
        const userOfDonateSales = await User.findOne({
          _id: donate_sales_id,
        }).exec();

        if (group_number === "1") {
          await Tree.findOneAndUpdate(
            {
              parent: userOfDonateSales._id,
            },
            {
              $push: { group1: user._id },
            }
          ).exec();
        } else if (group_number === "2") {
          await Tree.findOneAndUpdate(
            { parent: userOfDonateSales._id },
            {
              $push: { group2: user._id },
            }).exec();
        } else if (group_number === "3") {
          await Tree.findOneAndUpdate(
            { parent: userOfDonateSales._id },
            {
              $push: { group3: user._id },
            }).exec();
        } else {
          console.log("thêm id vào cha thất bại");
        }
      }


      // --------------- SAVE TREE -------------------
      const newTree = new Tree({
        parent: user._id,
        buy_package,
      });


      await newTree.save();

      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(
        oneYearFromNow.getFullYear() + 1
      );

      // --------------- SAVE COMMISSTIONS -------------------
      if (invite_code !== process.env.INVITE_CODE) {
        const userOfDonateSales = await User.findOne({
          _id: invite_code,
        }).exec();
        await returnCommission(
          trans_id,
          userOfDonateSales._id,
          buy_package,
          user._id,
          full_name.toUpperCase(),
          user.account_type,
          email
        );
      }

      // --------------- CREATE CLONE ACC -------------------
      if (buy_package === "3") {
        await createCloneBuyPackage3(user);
      }
      if (buy_package === "4") {
        await createCloneBuyPackage4(user);
      }

      // --------------- UPDATE LEVEL PARENT -------------------
      if (invite_code !== process.env.INVITE_CODE) {
        // updateParent(invite_code, buy_package);
        await checkPoint(donate_sales_id);
        await checkLevel(donate_sales_id);
        await checkChildPoint(donate_sales_id);
      }

      // --------------- GET APP ACTIVATIONS LINKS -------------------
      const links = await getActiveLink(
        email,
        full_name,
        phone,
        buy_package
      );

      if (links.length === 0) {
        console.log(`Lấy link active thất bại! Vui lòng thử lại sau`);
        unSavedErr.push({ field: "links" });
      }

      // --------------- SEND SUCCESS MAIL -------------------
      await paymentSuccessMail(
        user._id,
        links
      );
      await checkChildPoint(user._id);
      // --------------- SEND THANKS MAIL -------------------
      if (invite_code !== process.env.INVITE_CODE) {
        const userOfInvite = await User.findOne({
          _id: invite_code,
        }).exec();
        await reciveCommissonMail(
          user._id
        );
      }

      // --------------- RESET TOKEN TO EMPTY -------------------
      await Transaction.findOneAndUpdate(
        { token },
        { token: "", user_id: user._id, status: "success", orderId, approved_by: 'AUTO', approved_time: new Date }
      );

      // --------------- CONSOLE.LOG ERROR FIELD -------------------
      console.log("error field", unSavedErr);
    });
  });
}

exports.callback = async (req, res) => {
  const gateway = req.params.gateway;
  console.log("gateway", req.params.gateway);
  let asyncFunc = null;

  switch (gateway) {
    case "nganluong":
      asyncFunc = callbackNganLuong(req, res);
      break;
    default:
      break;
  }

  if (asyncFunc) {
    await asyncFunc.then(async () => {
      const isSucceed = res.locals.isSucceed;
      const orderId = res.locals.orderId;
      if (isSucceed) {
        const trans = await Transaction.findOne({ $and: [{ email: res.locals.email }, { status: 'pending' }] }).exec();

        if (trans) {
          const { token, _id } = trans;

          if (trans.is_renew) {
            await changeStatus(_id);
          } else {

            jwt.verify(
              token,
              process.env.JWT_ACCOUNT_ACTIVATION,
              async (err, decoded) => {
                if (err) {
                  return res.json({
                    status: 401,
                    message: "Đường dẫn đã hết hạn.Vui lòng đăng ký lại",
                    errors: [],
                  });
                } else {
                  await processDataActivation(jwt.decode(token), token, trans._id, orderId);
                }
              });
          }

          return res.redirect(
            `${process.env.CLIENT_URL}/payment/pay-success/${trans._id}`
          );
        }
      }
    });
  } else {
    res.send("No callback found");
  }
};

exports.cancel = async (req, res) => {
  res.redirect(process.env.CLIENT_URL);
};

const changeStatus = async (id) => {
  var trans = await Transaction.findOne({ _id: id }).exec();
  var commissOld = await Commission.findOne({ join_mem_id: trans.user_id }).sort({ _id: -1 }).exec();
  var user = await User.findOne({ _id: trans.user_id }).exec();
  var date = new Date(user.expire_time);
  await User.findOneAndUpdate({ _id: trans.user_id }, { expire_time: new Date(date.getFullYear() + 1, date.getMonth(), date.getDate()), renew_date: new Date(), count_renew: user.count_renew + 1, active: true }).exec();
  if (user.buy_package === "3") {
    await User.updateMany(
      { $and: [{ parent_id: user._id }, { is_clone: true }] },
      {
        expire_time: new Date(date.getFullYear() + 1, date.getMonth(), date.getDate()),
        renew_date: new Date(),
        count_renew: user.count_renew + 1,
        expired: false,
        active: true
      }).exec();
  }
  const listPackage = await Package.find().exec();
  const package = listPackage.find((ele) => ele.sid == user.buy_package);
  if (!commissOld) {
    if (user.parent_id !== process.env.INVITE_CODE) {
      var parent = await User.findOne({ _id: user.parent_id }).exec();
      if (parent) {

        let amount_vnd = 0;
        let amount_usd = 0;
        if (parent.buy_package == 1) {
          amount_vnd = package.commission.package1.price_vnd;
          amount_usd = package.commission.package1.price_usd;
        }
        if (parent.buy_package == 2) {
          amount_vnd = package.commission.package2.price_vnd;
          amount_usd = package.commission.package2.price_usd;
        }
        if (parent.buy_package == 3) {
          amount_vnd = package.commission.package3.price_vnd;
          amount_usd = package.commission.package3.price_usd;
        }
        if (parent.buy_package == 4) {
          amount_vnd = package.commission.package4.price_vnd;
          amount_usd = package.commission.package4.price_usd;
        }
        var commissNew = new Commission({
          trans_id: trans._id,
          join_mem_id: trans.join_mem_id,
          receive_mem_id: parent._id,
          join_mem_name: user.full_name,
          receive_mem_uname: user.parent_id === process.env.INVITE_CODE ? process.env.INVITE_CODE : removeAccents(parent.full_name),
          join_mem_uname: removeAccents(user.full_name),
          receive_mem_name: user.parent_id === process.env.INVITE_CODE ? process.env.INVITE_CODE : parent.full_name,
          status: 'pending',
          created_time: new Date(),
          amount_vnd,
          amount_usd,
          bank_account: user.parent_id === process.env.INVITE_CODE ? "" : parent.bank_account,
          bank: user.parent_id === process.env.INVITE_CODE ? "" : parent.bank,
          bank_name: user.parent_id === process.env.INVITE_CODE ? "" : parent.bank_name,
          buy_package: user.buy_package,
          is_renew: true,
          account_type: user.account_type
        });
        await commissNew.save();
      }
    }
  }
  else {
    var parent = await User.findOne({ _id: commissOld.receive_mem_id }).exec();
    if (parent) {

      let amount_vnd = 0;
      let amount_usd = 0;
      if (parent.buy_package == 1) {
        amount_vnd = package.commission.package1.price_vnd;
        amount_usd = package.commission.package1.price_usd;
      }
      if (parent.buy_package == 2) {
        amount_vnd = package.commission.package2.price_vnd;
        amount_usd = package.commission.package2.price_usd;
      }
      if (parent.buy_package == 3) {
        amount_vnd = package.commission.package3.price_vnd;
        amount_usd = package.commission.package3.price_usd;
      }
      if (parent.buy_package == 4) {
        amount_vnd = package.commission.package4.price_vnd;
        amount_usd = package.commission.package4.price_usd;
      }
      var commissNew = new Commission({
        trans_id: trans._id,
        join_mem_id: commissOld.join_mem_id,
        receive_mem_id: commissOld.receive_mem_id,
        join_mem_name: commissOld.join_mem_name,
        receive_mem_name: parent.full_name,
        receive_mem_uname: removeAccents(parent.full_name),
        join_mem_uname: removeAccents(commissOld.receive_mem_name),
        status: 'pending',
        created_time: new Date(),
        amount_vnd,
        amount_usd,
        bank_account: parent.bank_account,
        bank: parent.bank,
        bank_name: parent.bank_name,
        buy_package: commissOld.buy_package,
        is_renew: true,
        account_type: user.account_type
      });
      await commissNew.save();
    }

  }
  await checkPoint(user._id);
  await checkPoint(user.parent_id);
  await Transaction.findOneAndUpdate({ _id: trans._id }, { status: 'success', approved_time: new Date(), approved_by: 'AUTO' }).exec();
  await renewSuccess(user._id);
}

exports.payWithPaypal = async (req, res) => {
  const { trans_id, orderId } = req.body;
  await Transaction.findOneAndUpdate({ _id: trans_id }, { payment_method: "PAYPAL", approved_time: new Date(), approved_by: 'AUTO' }).exec();
  const trans = await Transaction.findOne({ $and: [{ _id: trans_id }, { status: 'pending' }] }).exec();

  const { token, _id } = trans;

  if (trans.is_renew) {
    await changeStatus(_id);
  } else {
    jwt.verify(
      token,
      process.env.JWT_ACCOUNT_ACTIVATION,
      async (err, decoded) => {
        if (err) {
          return res.json({
            status: 401,
            message: "Đường dẫn đã hết hạn.Vui lòng đăng ký lại",
            errors: [],
          });
        } else {
          await processDataActivation(jwt.decode(token), token, trans._id, orderId);
        }
      });
    const url = `/payment/pay-success/${trans_id}`;
    res.json({
      status: 200,
      data: { url },
      errors: [],
      message: "Đã lưu thành công"
    });

    // return res.redirect(url);
  }
}

exports.successWatched = async (req, res) => {
  const { trans_id } = req.body;
  const trans = await Transaction.findOne({ $and: [{ _id: trans_id }] }).exec();
  if (!trans) {
    res.json({
      status: 400,
      data: {},
      errors: [],
      message: ""
    });
  } else {
    if (trans.watched_success) {
      res.json({
        status: 400,
        data: {},
        errors: [],
        message: ""
      });
    } else {
      await Transaction.findOneAndUpdate({ _id: trans_id }, { watched_success: true }).exec();
      res.json({
        status: 200,
        data: { trans },
        errors: [],
        message: ""
      });
    }
  }
}

exports.payWithCredit = async (req, res) => {
  console.log('body', req.body);
  const { trans_id, card_number, name_on_card, expiry, cvc } = req.body;
  const trans = await Transaction.findOne({ $and: [{ _id: trans_id }, { status: 'pending' }] }).exec();
  console.log('trans', trans);
  const { token, _id } = trans;
  class DirectPost {
    constructor(security_key) {
      this.security_key = security_key;
    }

    setBilling(billingInformation) {
      // Validate that passed in information contains valid keys
      const validBillingKeys = ['first_name', 'last_name', 'company', 'address1',
        'address2', 'city', 'state', 'zip', 'country', 'phone', 'fax', 'email'];

      for (let key in billingInformation) {
        if (!validBillingKeys.includes(key)) {
          throw new Error(`Invalid key provided in billingInformation. '${key}'
            is not a valid billing parameter.`)
        }
      };

      this.billing = billingInformation;
    }

    setShipping(shippingInformation) {
      // Validate that passed in information contains valid keys
      const validShippingKeys = [
        'shipping_first_name', 'shipping_last_name', 'shipping_company',
        'shipping_address1', 'address2', 'shipping_city', 'shipping_state',
        'shipping_zip', 'shipping_country', 'shipping_email'
      ];

      for (let key in shippingInformation) {
        if (!validShippingKeys.includes(key)) {
          throw new Error(`Invalid key provided in shippingInformation. '${key}'
            is not a valid shipping parameter.`)
        }
      };

      this.shipping = shippingInformation;
    }

    doSale(amount, ccNum, ccExp, cvv) {
      let requestOptions = {
        'type': 'sale',
        'amount': amount,
        'ccnumber': ccNum,
        'ccexp': ccExp,
        'cvv': cvv
      };

      // Merge together all request options into one object
      Object.assign(requestOptions, this.billing, this.shipping);

      // Make request
      this._doRequest(requestOptions);
    }

    _doRequest(postData) {
      const hostName = 'secure.networkmerchants.com';
      const path = '/api/transact.php';

      postData.security_key = this.security_key;
      postData = querystring.stringify(postData);

      const options = {
        hostname: hostName,
        path: path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      // Make request to Payment API
      const req = https.request(options, (response) => {
        console.log(`STATUS: ${response.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(response.headers)}`);

        response.on('data', async (chunk) => {
          console.log(`BODY: ${chunk}`);
          let params = new URLSearchParams(`${chunk}`);
          let result = params.get("response");
          let orderId = params.get("orderid");
          const url = `/payment/pay-success/${trans_id}`;
          if (result === '1') {
            await Transaction.findOneAndUpdate({ _id: trans_id }, { payment_method: "Credit Card", approved_time: new Date(), approved_by: 'AUTO' }).exec();
            if (trans.is_renew) {
              await changeStatus(_id);
              res.json({
                status: 200,
                data: { url },
                errors: [],
                message: "Transaction Approved"
              });
            } else {
              jwt.verify(
                token,
                process.env.JWT_ACCOUNT_ACTIVATION,
                async (err, decoded) => {
                  if (err) {
                    return res.json({
                      status: 401,
                      message: "Đường dẫn đã hết hạn.Vui lòng đăng ký lại",
                      errors: [],
                    });
                  } else {
                    await processDataActivation(jwt.decode(token), token, trans._id, orderId);
                    res.json({
                      status: 200,
                      data: { url },
                      errors: [],
                      message: "Transaction Approved"
                    });
                  }
                });
            }
          } else if (result === '2') {
            res.json({
              status: 401,
              message: "Transaction Declined"
            })
          } else {
            res.json({
              status: 400,
              message: "Error in transaction data or system error",
              errors: [
                { label: "card_number", err_message: "Please check this field again" },
                { label: "name_on_card", err_message: "Please check this field again" },
                { label: "expiry", err_message: "Please check this field again" },
                { label: "cvc", err_message: "Please check this field again" }
              ]
            })
          }
        });
        response.on('end', () => {
          console.log('No more data in response.');
        });
      });

      req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
      });

      // Write post data to request body
      req.write(postData);
      req.end();
    }
  }

  const dp = new DirectPost(process.env.CREDIT_SECURE_NUMBER);
  const billingInfo = {
    'first_name': name_on_card,
    'last_name': '',
    'address1': '',
    'city': '',
    'state': '',
    'zip': '',
  }
  const shippingInfo = {
    'shipping_first_name': name_on_card,
    'shipping_last_name': '',
    'shipping_address1': '',
    'shipping_city': '',
    'shipping_state': '',
    'shipping_zip': '',
  }

  dp.setBilling(billingInfo);
  dp.setShipping(shippingInfo);
  // Set dummy data for sale
  dp.doSale(trans.amount_usd, card_number, expiry, cvc);
}
