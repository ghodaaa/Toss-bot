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

🎯 Select Team`,

reply_markup: {
inline_keyboard: [

[
{
text: toss.teamA,
callback_data: `bet_${toss.tossId}_${toss.teamA}`
},

{
text: toss.teamB,
callback_data: `bet_${toss.tossId}_${toss.teamB}`
}
]

]
}

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
Markup.button.callback("🏆 Declare Result", "results")
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

// ==== RESULTS===

bot.action("results", async (ctx) => {

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

`🏏 ${toss.teamA} vs ${toss.teamB}

🆔 Toss ID: ${toss.tossId}

Select Winner`,

{
reply_markup: {
inline_keyboard: [

[
{
text: toss.teamA,
callback_data: `result_${toss.tossId}_${toss.teamA}`
},

{
text: toss.teamB,
callback_data: `result_${toss.tossId}_${toss.teamB}`
}
]

]
}
}

    );

  }

});

// ================= USER CONTROL =================

bot.action("usercontrol", async (ctx) => {

  if (ctx.from.id !== ADMIN_ID) {
    return;
  }

  ctx.reply(

`👤 USER CONTROL

Send command in this format:

add dpid amount

Example:
add 1 500

deduct dpid amount

Example:
deduct 1 200`

  );

});



// ================= MESSAGE HANDLER =================
bot.action(/bet_(.+)/, async (ctx) => {

  const data = ctx.match[1].split("_");

  const tossId = Number(data[0]);

  const team = data[1];

  const toss = await Toss.findOne({
    tossId
  });

  if (!toss) {
    return ctx.reply("❌ Toss Not Found");
  }

  if (toss.status !== "open") {
    return ctx.reply("🚫 Bets Closed");
  }

  const user = await User.findOne({
    telegramId: ctx.from.id
  });

  if (user.isBanned) {
    return ctx.reply("❌ Account Banned");
  }

  if (user.holdBalance) {
    return ctx.reply("⛔ Wallet On Hold");
  }

  userState[ctx.from.id] = {
    tossId,
    team
  };

  ctx.reply(

`🏏 ${team}

💰 Send Bet Amount`

  );

});

bot.action(/result_(.+)/, async (ctx) => {

if (ctx.from.id !== ADMIN_ID) {
  return;
}

const data = ctx.match[1].split("_");

const tossId = Number(data[0]);

const winnerTeam = data[1];

const toss = await Toss.findOne({
  tossId
});

if (!toss) {
  return ctx.reply("❌ Toss Not Found");
}

const bets = await Bet.find({
  tossId,
  status: "pending"
});

for (const bet of bets) {

  if (bet.team === winnerTeam) {

    const winAmount = bet.amount * 1.95;

    const user = await User.findOne({
      telegramId: bet.userId
    });

    user.balance += winAmount;

    await user.save();

    bet.status = "won";

    await bet.save();

  }

  else {

    bet.status = "lost";

    await bet.save();

  }

}

toss.status = "completed";

toss.winner = winnerTeam;

await toss.save();

ctx.reply(

`🏆 Result Declared

🏏 Winner: ${winnerTeam}

✅ Settlement Completed`

);

});

bot.on("message", async (ctx) => {
const userBetState = userState[ctx.from.id];

if (userBetState && ctx.from.id !== ADMIN_ID) {

const amount = Number(ctx.message.text);

if (isNaN(amount) || amount <= 0) {
  return ctx.reply("❌ Invalid Amount");
}

const user = await User.findOne({
  telegramId: ctx.from.id
});

if (user.balance < amount) {
  return ctx.reply("❌ Insufficient Balance");
}

user.balance -= amount;

await user.save();

await Bet.create({

  userId: ctx.from.id,

  tossId: userBetState.tossId,

  team: userBetState.team,

  amount

});

delete userState[ctx.from.id];

return ctx.reply(

`✅ Bet Placed

🏏 Team: ${userBetState.team}
💰 Amount: ₹${amount}`

);

}



if (ctx.from.id === ADMIN_ID && ctx.message.text) {

const text = ctx.message.text.split(" ");

const action = text[0];

const dpId = Number(text[1]);

const amount = Number(text[2]);

if (action === "add") {

const user = await User.findOne({ dpId });

if (!user) {
  return ctx.reply("❌ User Not Found");
}

user.balance += amount;

await user.save();

return ctx.reply(

`✅ Balance Added

🆔 DP ID: ${dpId}
💰 Amount: ₹${amount}`

);

}

if (action === "deduct") {

const user = await User.findOne({ dpId });

if (!user) {
  return ctx.reply("❌ User Not Found");
}

user.balance -= amount;

if (user.balance < 0) {
  user.balance = 0;
}

await user.save();

return ctx.reply(

`✅ Balance Deducted

🆔 DP ID: ${dpId}
💰 Amount: ₹${amount}`

);

}

}

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