const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
require('dotenv').config();

// Config: get from env or command line
const INTERVIEW_ID = process.env.INTERVIEW_ID || process.argv[2];
const TOKEN = process.env.TWILIO_TOKEN || process.argv[3];
const ROOM_NAME = process.env.ROOM_NAME || process.argv[4];
const API_URL = process.env.API_URL || 'https://your-backend-url.com/api/v1';
const BOT_HTML = process.env.BOT_HTML || 'file://' + __dirname + '/bot.html';

if (!INTERVIEW_ID || !TOKEN || !ROOM_NAME) {
  console.error('Usage: node bot.js <INTERVIEW_ID> <TWILIO_TOKEN> <ROOM_NAME>');
  process.exit(1);
}

async function fetchCurrentQuestion() {
  const res = await fetch(`${API_URL}/interview/${INTERVIEW_ID}`);
  if (!res.ok) throw new Error('Failed to fetch interview');
  const data = await res.json();
  const idx = data.currentQuestionIndex || 0;
  const questions = data.questions || [];
  return questions[idx] || null;
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--use-fake-ui-for-media-stream'] });
  const page = await browser.newPage();

  // Helper to set question in the bot page
  async function setQuestionOnPage(question) {
    await page.evaluate((q) => {
      window.setBotQuestion && window.setBotQuestion(q);
    }, question);
  }

  // Expose a function in bot.html to update the question and speak it
  await page.exposeFunction('setBotQuestion', async (question) => {
    await page.evaluate((q) => {
      document.getElementById('question').textContent = q || '';
      if (q) {
        const utter = new window.SpeechSynthesisUtterance(q);
        window.speechSynthesis.speak(utter);
      }
    }, question);
  });

  // Load the bot.html page with initial params
  const url = `${BOT_HTML}?token=${encodeURIComponent(TOKEN)}&roomName=${encodeURIComponent(ROOM_NAME)}`;
  await page.goto(url);

  let lastQuestion = null;
  while (true) {
    try {
      const question = await fetchCurrentQuestion();
      if (question && question !== lastQuestion) {
        await setQuestionOnPage(question);
        lastQuestion = question;
      }
      if (!question) {
        console.log('No more questions. Interview complete.');
        break;
      }
    } catch (err) {
      console.error('Error polling for question:', err);
    }
    await new Promise((res) => setTimeout(res, 2000)); // poll every 2s
  }
  await browser.close();
})(); 