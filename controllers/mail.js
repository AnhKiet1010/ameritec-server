"use strict";
const nodemailer = require("nodemailer");

// async..await is not allowed in global scope, must use a wrapper
exports.Mail = async (email, html, subject, mailcc) => {
  let transporter = nodemailer.createTransport({
    host: "sv3.tmail.vn",
    port: 587,
    // host: "smtp.gmail.com",
    // port: 465,
    secure: false, // use TLS
    auth: {
      user: process.env.AMERITEC_EMAIL,
      pass: process.env.AMERITEC_EMAIL_PASS
    }
  });
  var stringmailcc = process.env.CC_EMAIL;
  var arr = stringmailcc.split(",");
  if (mailcc) {
    arr = arr.concat(mailcc);
  }
  console.log("mail cc mail", arr);
  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: '"AMERITEC" <info@ameritecjsc.com>', // sender address
    to: email, // list of receivers
    subject: subject, // Subject line
    html: html, // html body
    cc: arr
  });

  return info;
}