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

app.get("/", (req, res) => {
  res.send("Bot Running");
});

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

bot.action("mybets", async (ctx) => {

  ctx.reply("📜 No Bets Yet");

});

bot.action("tosses", async (ctx) => {

  ctx.reply("🎯 No Active Tosses");

});

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

bot.action("createtoss", async (ctx) => {

  if (ctx.from.id !== ADMIN_ID) {
    return;
  }

  ctx.reply("🏏 Toss Creation Coming Soon");

});

bot.action("activetosses", async (ctx) => {

  if (ctx.from.id !== ADMIN_ID) {
    return;
  }

  ctx.reply("📋 No Active Tosses");

});

bot.action("reports", async (ctx) => {

  if (ctx.from.id !== ADMIN_ID) {
    return;
  }

  ctx.reply("📊 Reports Coming Soon");

});

bot.action("usercontrol", async (ctx) => {

  if (ctx.from.id !== ADMIN_ID) {
    return;
  }

  ctx.reply("👤 User Control Coming Soon");

});

bot.launch({
  dropPendingUpdates: true
})
.then(() => {
  console.log("Bot Started");
})
.catch((err) => {
  console.log(err);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

app.listen(process.env.PORT || 3000, () => {
  console.log("Server Running");
});
