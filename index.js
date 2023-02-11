require("dotenv").config();

const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const shell = require('shelljs')
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");


const CronJob = require("cron").CronJob;

const app = express();
const httpServer = require("http").createServer(app);
const io = require("socket.io")(httpServer, {
  origins: ['*'],
  cors: {
    origin: "*",
    credentials: true
  },
  transports: ['websocket', 'polling', 'flashsocket']
});

const connectDB = require("./config/db");



// parse application/x-www-form-urlencoded
// app.use(express.json());

// parse application/json
const limiter = rateLimit({
  // 15 minutes
  windowMs: 1 * 60 * 1000,
  // limit each IP to 100 requests per windowMs
  max: 100,
});
app.use(limiter);
app.use(express.json({ limit: '50mb', extended: true }));
app.use(express.urlencoded({ extended: false, limit: '2gb' }));

// Dev Login Middleware
// app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
var list_socket = [];
io.on("connection", async socket => {
  list_socket.push(socket.id);
  console.log('NEW CONNECTION : ', socket.id);
  socket.on('disconnect', () => {
    console.log('CLIENT DISCONNECTION : ', socket.id);
    var index = list_socket.indexOf(socket.id);
    if (index > -1) {
      list_socket.splice(index, 1);
    }
  });
  socket.on('hello', () => console.log('------------CLIENT HELLO----------'));
});

app.set("io", io);

app.get('/list', function (req, res) {
  ses.listVerifiedEmailAddresses(function (err, data) {
    if (err) {
      res.send(err);
    }
    else {
      res.send(data);
    }
  });
});

app.get("/", (req, res) => {
  res.send("Server is OK");
})

const authRouter = require("./routes/auth.route");
app.use("/api/auth", authRouter);

const treeRouter = require("./routes/tree.route");
app.use("/tree", treeRouter);

const transRouter = require("./routes/trans.route");
app.use("/api/trans", transRouter);

const adminRouter = require("./routes/admin.route");
app.use("/api/admin", adminRouter);

const clientRouter = require("./routes/client.route");
app.use("/api/client", clientRouter);

const paymentRouter = require("./routes/payment.route");
app.use("/api/payment", paymentRouter);

const commissionRouter = require("./routes/commission.route");
app.use("/api/commission", commissionRouter);

const requestRouter = require("./routes/request.route");
app.use("/api/request", requestRouter);

const bonusRouter = require("./routes/bonus.route");
app.use("/api/bonus", bonusRouter);

const policyRouter = require("./routes/policy.route");
app.use("/api/policy", policyRouter);

const packageRouter = require("./routes/package.route");
app.use("/api/package", packageRouter);

const mailtemplateRouter = require("./routes/mailtemplate.route");
app.use("/api/mail", mailtemplateRouter);
// Connect to database
connectDB();

const { deletePendingTransactions, setExpiredUser } = require("./config/cron");

// const cron1 = new CronJob("*/15 * * * *", () => {
//   console.log("Running delete pending transaction");
//   deletePendingTransactions();
// });

const cron2 = new CronJob("0 0 * * *", () => {
  console.log("Running set expired user");
  setExpiredUser();
}, null, true, "Asia/Ho_Chi_Minh");
// const cron3 = new CronJob("0 23 * * *", () => {
//   console.log("Running back up DB");
//   shell.exec('../backup.sh')
// }, null, true, "Asia/Ho_Chi_Minh");
// cron3.start();
// cron1.start();
cron2.start();

app.use(express.static("public"));

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});



