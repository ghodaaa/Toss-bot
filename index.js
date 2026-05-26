const express = require("express");
const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = Number(process.env.ADMIN_ID);

const app = express();

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

bot.launch();

app.listen(process.env.PORT || 3000, () => {
  console.log("Server Running");
});
