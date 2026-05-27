require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const { Telegraf, Markup } = require("telegraf");

const app = express();

const bot = new Telegraf(process.env.BOT_TOKEN);

const ADMIN_ID = Number(process.env.ADMIN_ID);

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch((err) => console.log(err));



// ================= USERS =================

const userSchema = new mongoose.Schema({

  dpId: Number,

  telegramId: Number,

  username: String,

  balance: {
    type: Number,
    default: 0
  },

  isBanned: {
    type: Boolean,
    default: false
  },

  holdBalance: {
    type: Boolean,
    default: false
  }

});

const User = mongoose.model("User", userSchema);

const betSchema = new mongoose.Schema({

  userId: Number,

  tossId: Number,

  team: String,

  amount: Number,

  status: {
    type: String,
    default: "pending"
  }

});

const Bet = mongoose.model("Bet", betSchema);



// ================= TOSSES =================

const tossSchema = new mongoose.Schema({

  tossId: Number,

  image: String,

  teamA: String,

  teamB: String,

  matchTime: String,

  status: {
    type: String,
    default: "open"
  },

  winner: {
    type: String,
    default: null
  }

});

const Toss = mongoose.model("Toss", tossSchema);



// ================= ADMIN STATE =================

const adminState = {};
const userState = {};


// ================= SERVER =================

app.get("/", (req, res) => {
  res.send("Bot Running");
});



// ================= START =================

bot.start(async (ctx) => {

  let user = await User.findOne({
    telegramId: ctx.from.id
  });

  if (!user) {

    const count = await User.countDocuments();

    user = await User.create({
      telegramId: ctx.from.id,
      username: ctx.from.username,
      dpId: count + 1
    });

  }

  const buttons = [];

  buttons.push([
    Markup.button.callback("🎯 Available Tosses", "tosses")
  ]);

  buttons.push([
    Markup.button.callback("💰 Wallet", "wallet")
  ]);

  buttons.push([
    Markup.button.callback("📜 My Bets", "mybets")
  ]);

  if (ctx.from.id === ADMIN_ID) {

    buttons.push([
      Markup.button.callback("⚙️ Admin Panel", "adminpanel")
    ]);

  }

  ctx.reply(

`🏏 Welcome ${ctx.from.first_name}

🆔 DP ID: ${user.dpId}
💰 Balance: ₹${user.balance}`,

Markup.inlineKeyboard(buttons)

  );

});



// ================= WALLET =================

bot.action("wallet", async (ctx) => {

  let user = await User.findOne({
    telegramId: ctx.from.id
  });

  ctx.reply(

`💰 WALLET

🆔 DP ID: ${user.dpId}
💵 Balance: ₹${user.balance}`

  );

});



// ================= MY BETS =================

bot.action("mybets", async (ctx) => {

  ctx.reply("📜 No Bets Yet");

});



// ================= ACTIVE TOSSES =================

bot.action("tosses", async (ctx) => {

  const tosses = await Toss.find({
    status: "open"
  });

  if (tosses.length === 0) {
    return ctx.reply("❌ No Active Tosses");
  }

  for (const toss of tosses) {

    await ctx.replyWithPhoto(toss.image, {

      caption:

`🏏 ${toss.teamA} vs ${toss.teamB}

⏰ ${toss.matchTime}

🎯 Bets Open`

    });

  }

});



// ================= ADMIN PANEL =================

bot.action("adminpanel", async (ctx) => {

  if (ctx.from.id !== ADMIN_ID) {
    return ctx.reply("❌ Access Denied");
  }

  ctx.reply(

`⚙️ ADMIN PANEL`,

Markup.inlineKeyboard([

[
Markup.button.callback("➕ Create Toss", "createtoss")
],

[
Markup.button.callback("📋 Active Tosses", "activetosses")
],

[
Markup.button.callback("📊 Reports", "reports")
],

[
Markup.button.callback("👤 User Control", "usercontrol")
]

])

  );

});



// ================= CREATE TOSS =================

bot.action("createtoss", async (ctx) => {

  if (ctx.from.id !== ADMIN_ID) {
    return;
  }

  adminState[ctx.from.id] = {
    step: "image"
  };

  ctx.reply("📸 Send Toss Image");

});



// ================= ACTIVE TOSSES ADMIN =================

bot.action("activetosses", async (ctx) => {

  if (ctx.from.id !== ADMIN_ID) {
    return;
  }

  const tosses = await Toss.find({
    status: "open"
  });

  if (tosses.length === 0) {
    return ctx.reply("❌ No Active Tosses");
  }

  for (const toss of tosses) {

    await ctx.reply(

`🆔 Toss ID: ${toss.tossId}

🏏 ${toss.teamA} vs ${toss.teamB}

⏰ ${toss.matchTime}

📌 Status: ${toss.status}`

    );

  }

});



// ================= REPORTS =================

bot.action("reports", async (ctx) => {

  if (ctx.from.id !== ADMIN_ID) {
    return;
  }

  ctx.reply("📊 Reports Coming Soon");

});



// ================= USER CONTROL =================

bot.action("usercontrol", async (ctx) => {

  if (ctx.from.id !== ADMIN_ID) {
    return;
  }

  ctx.reply("👤 User Control Coming Soon");

});



// ================= MESSAGE HANDLER =================

bot.on("message", async (ctx) => {

  if (ctx.from.id !== ADMIN_ID) return;

  const state = adminState[ctx.from.id];

  if (!state) return;

  // IMAGE

  if (state.step === "image") {

    if (!ctx.message.photo) {
      return ctx.reply("❌ Send Valid Image");
    }

    const photos = ctx.message.photo;

    state.image = photos[photos.length - 1].file_id;

    state.step = "teamA";

    return ctx.reply("🏏 Send Team A Name");
  }

  // TEAM A

  if (state.step === "teamA") {

    state.teamA = ctx.message.text;

    state.step = "teamB";

    return ctx.reply("🏏 Send Team B Name");
  }

  // TEAM B

  if (state.step === "teamB") {

    state.teamB = ctx.message.text;

    state.step = "time";

    return ctx.reply("⏰ Send Match Time");
  }

  // TIME

  if (state.step === "time") {

    state.matchTime = ctx.message.text;

    const count = await Toss.countDocuments();

    await Toss.create({

      tossId: count + 1,

      image: state.image,

      teamA: state.teamA,

      teamB: state.teamB,

      matchTime: state.matchTime

    });

    delete adminState[ctx.from.id];

    return ctx.reply("✅ Toss Created Successfully");

  }

});



// ================= BOT START =================

bot.telegram.deleteWebhook()
.then(() => {

bot.launch({
  dropPendingUpdates: true
})

.then(() => {
  console.log("Bot Started");
})

.catch((err) => {
  console.log(err);
});

});



process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));



app.listen(process.env.PORT || 3000, () => {
  console.log("Server Running");
});