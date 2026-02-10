const TelegramBot = require('telegram-bot-api');
const axios = require('axios');
require('dotenv').config();

const bot = new TelegramBot({
  token: process.env.TELEGRAM_BOT_TOKEN,
  updates: {
    enabled: true,
    get_interval: 1000
  }
});

const SERVER_URL = 'http://localhost:3000';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Foydalanuvchilar sessiyalarini saqlash
const userSessions = new Map();

// ==============
// BOT COMMANDS
// ==============

bot.on('message', async (message) => {
  const msg_id = message.message_id;
  const chat_id = message.chat.id;
  const user_id = message.from.id;
  const username = message.from.username || message.from.first_name;
  const text = message.text;

  try {
    // /start buyrug'i
    if (text === '/start') {
      await bot.sendMessage({
        chat_id,
        text: `👋 Assalomu alaykum, ${username}!\n\n🎯 Testni boshlash uchun web ilovani oching:\n\nhttps://test-bot-app.vercel.app\n\n📋 Foydalanish:\n1️⃣ Ismingizni kiriting\n2️⃣ Fanni va test kodini tanlang\n3️⃣ Testni yeching va natijani oling!`
      });
      return;
    }

    // Admin buyruqlari
    if (text.startsWith('/add_teacher')) {
      const args = text.split(' ');
      const teacher_id = parseInt(args[1]);
      const limit = parseInt(args[2]) || 5;

      await axios.post(`${SERVER_URL}/api/teachers/add`, {
        admin_id: user_id,
        telegram_id: teacher_id,
        username: username,
        full_name: message.from.first_name,
        test_limit: limit
      });

      await bot.sendMessage({
        chat_id: CHAT_ID,
        text: `✅ O'qituvchi qo'shildi!\n👤 ID: ${teacher_id}\n📊 Limit: ${limit} ta test`
      });
      return;
    }

    // /broadcast buyrug'i
    if (text.startsWith('/broadcast')) {
      const broadcastMessage = text.replace('/broadcast', '').trim();
      await axios.post(`${SERVER_URL}/api/broadcast`, {
        sender_id: user_id,
        message: broadcastMessage
      });

      await bot.sendMessage({
        chat_id: CHAT_ID,
        text: `📢 REKLAMA:\n\n${broadcastMessage}`
      });
      return;
    }

    // Test kodini kiritish
    if (text.match(/^\d{2}$/)) {
      userSessions.set(user_id, { test_code: text, step: 'waiting_for_test_count' });
      await bot.sendMessage({
        chat_id,
        text: `📝 Test kodingiz: ${text}\n\nTestlarning sonini kiriting (10-90):`
      });
      return;
    }

    // Test sonini kiritish
    if (userSessions.has(user_id) && userSessions.get(user_id).step === 'waiting_for_test_count') {
      const count = parseInt(text);
      if (count >= 10 && count <= 90) {
        const session = userSessions.get(user_id);
        session.test_count = count;
        session.step = 'waiting_for_scoring_method';

        await bot.sendMessage({
          chat_id,
          text: `✅ Test soni: ${count}\n\nBaholash tartibini tanlang:\n\n1️⃣ /general - Umumiy (1 ball)\n2️⃣ /special - Maxsus (1.1, 2.1, 3.1 ball)`
        });
      } else {
        await bot.sendMessage({
          chat_id,
          text: '❌ Noto\'g\'ri! 10 dan 90 gacha raqam kiriting.'
        });
      }
      return;
    }

    // Baholash tartibini tanlash
    if (text === '/general' || text === '/special') {
      if (!userSessions.has(user_id)) {
        await bot.sendMessage({
          chat_id,
          text: '❌ Sessiyang tugadi. Qayta /start bosing.'
        });
        return;
      }

      const session = userSessions.get(user_id);
      session.scoring_method = text === '/general' ? 'general' : 'special';

      // Web ilovaga yo'naltirish
      const webLink = `https://test-bot-app.vercel.app?user_id=${user_id}&username=${username}&test_code=${session.test_code}&test_count=${session.test_count}&scoring=${session.scoring_method}`;

      await bot.sendMessage({
        chat_id,
        text: `✅ Tayyor!\n\n📱 Web ilovaga o'ting va testni yechish bilan ishni boshlang:\n\n${webLink}`,
        reply_markup: {
          inline_keyboard: [[
            { text: '🚀 Testni Boshlash', url: webLink }
          ]]
        }
      });

      userSessions.delete(user_id);
      return;
    }

  } catch (error) {
    console.error('Bot xatosi:', error);
    await bot.sendMessage({
      chat_id,
      text: '❌ Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.'
    });
  }
});

console.log('✅ Telegram Bot ishlayapti...');

module.exports = bot;
