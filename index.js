const express = require("express");
const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);

const app = express();

app.get("/", (req, res) => {
  res.send("Bot Running");
});

bot.start((ctx) => {
  ctx.reply("Toss Bot Active 🌝");
});

bot.launch();

app.listen(process.env.PORT || 3000, () => {
  console.log("Server Running");
});
