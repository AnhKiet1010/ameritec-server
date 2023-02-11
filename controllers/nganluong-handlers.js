const { NganLuong } = require('./NganLuong/NganLuong');

/* eslint-disable no-param-reassign */
const nganluong = new NganLuong({
	// paymentGateway: "https://sandbox.nganluong.vn:8088/nl35/checkout.api.nganluong.post.php",
	// merchant: "50825",
	// receiverEmail: "annagueysonny005@gmail.com",
	// secureSecret: "b0d9be5e2f9991d1f2444b7ccf0a9af8",
	paymentGateway: "https://www.nganluong.vn/checkout.api.nganluong.post.php",
	merchant: process.env.MERCHANT_ID,
	receiverEmail: "ameritecjsc@gmail.com",
	secureSecret: process.env.NL_SECURE,
});

exports.checkoutNganLuong = (req, res) => {
	const checkoutData = res.locals.checkoutData;
	checkoutData.returnUrl = `http://${process.env.HTTP_SERVER}/api/payment/nganluong/callback`;
	checkoutData.cancelUrl = `http://${process.env.HTTP_SERVER}/api/payment/cancel`;
	checkoutData.orderInfo = 'Mua thiết bị bảo mật di động';
	checkoutData.locale = checkoutData.locale === 'en' ? 'en' : 'vi';
	checkoutData.paymentType = '1';
	checkoutData.totalItem = '1';

	return nganluong.buildCheckoutUrl(checkoutData).then(checkoutUrl => {
		res.locals.checkoutUrl = checkoutUrl;
		return checkoutUrl;
	});
}

exports.callbackNganLuong = (req, res) => {
	const query = req.query;

	return nganluong.verifyReturnUrl(query).then(results => {
		if (results) {
			res.locals.email = results.customerEmail;
			res.locals.orderId = results.transactionId || '';
			res.locals.price = results.amount;
			res.locals.isSucceed = results.isSuccess;
			res.locals.message = results.message;
		} else {
			res.locals.isSucceed = false;
		}
	});
}
