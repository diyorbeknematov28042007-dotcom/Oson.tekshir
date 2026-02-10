const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('web'));

// Supabase Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ==============
// API ROUTES
// ==============

// 1. FOYDALANUVCHINI RO'YXATDAN O'TQAZISH
app.post('/api/register', async (req, res) => {
  try {
    const { telegram_id, username, full_name } = req.body;

    const { data, error } = await supabase
      .from('users')
      .insert([{ telegram_id, username, full_name }])
      .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. TEST QOSHISH
app.post('/api/tests/create', async (req, res) => {
  try {
    const { subject, test_code, questions, correct_answers, created_by } = req.body;

    // O'qituvchi limitini tekshirish
    const { data: teacher } = await supabase
      .from('teachers')
      .select('*')
      .eq('telegram_id', created_by)
      .single();

    if (!teacher) return res.status(403).json({ error: 'O\'qituvchi topilmadi' });
    
    if (teacher.test_limit !== -1 && teacher.tests_created >= teacher.test_limit) {
      return res.status(403).json({ error: 'Limitingiz tugadi' });
    }

    const { data, error } = await supabase
      .from('tests')
      .insert([{
        subject,
        test_code,
        questions: JSON.stringify(questions),
        correct_answers: JSON.stringify(correct_answers),
        created_by
      }])
      .select();

    if (error) return res.status(400).json({ error: error.message });

    // O'qituvchi tomonidan yaratilgan test sonini oshirish
    await supabase
      .from('teachers')
      .update({ tests_created: teacher.tests_created + 1 })
      .eq('telegram_id', created_by);

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. TEST TOPSHIRIQNI TEKSHIRISH
app.post('/api/tests/check', async (req, res) => {
  try {
    const { test_id, user_id, username, full_name, answers, scoring_method } = req.body;

    // Test'ni olish
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('*')
      .eq('id', test_id)
      .single();

    if (testError || !test) return res.status(404).json({ error: 'Test topilmadi' });

    const correctAnswers = test.correct_answers;
    let score = 0;
    let wrongQuestions = [];

    // Javoblarni tekshirish
    answers.forEach((answer, index) => {
      if (correctAnswers[index] === answer) {
        if (scoring_method === 'general') {
          score += 1; // Umumiy: 1 ball
        } else if (scoring_method === 'special') {
          // Maxsus: 1.1, 2.1, 3.1 ball
          if (index < 30) score += 1.1;
          else if (index < 60) score += 2.1;
          else score += 3.1;
        }
      } else {
        wrongQuestions.push(index + 1);
      }
    });

    // Natijalani saqlash
    const { data: result, error } = await supabase
      .from('results')
      .insert([{
        test_id,
        user_id,
        username,
        full_name,
        answers: JSON.stringify(answers),
        score,
        wrong_questions: JSON.stringify(wrongQuestions)
      }])
      .select();

    if (error) return res.status(400).json({ error: error.message });

    res.json({ success: true, score, wrongQuestions, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. TEST NATIJALARINI OLISH
app.get('/api/tests/:testId/results', async (req, res) => {
  try {
    const { testId } = req.params;

    const { data: results, error } = await supabase
      .from('results')
      .select('*')
      .eq('test_id', testId)
      .order('score', { ascending: false })
      .order('completed_at', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. O'QITUVCHI QOSHISH (ADMIN FAQAT)
app.post('/api/teachers/add', async (req, res) => {
  try {
    const { admin_id, telegram_id, username, full_name, test_limit } = req.body;

    // Admin tekshirish
    const { data: admin, error: adminError } = await supabase
      .from('teachers')
      .select('*')
      .eq('telegram_id', admin_id)
      .eq('role', 'admin')
      .single();

    if (!admin) return res.status(403).json({ error: 'Faqat Admin qo\'sha oladi' });

    const { data, error } = await supabase
      .from('teachers')
      .insert([{
        telegram_id,
        username,
        full_name,
        role: 'teacher',
        test_limit: test_limit || 5
      }])
      .select();

    if (error) return res.status(400).json({ error: error.message });

    res.json({ success: true, message: 'O\'qituvchi qo\'shildi', data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. REKLAMA YUBORISH
app.post('/api/broadcast', async (req, res) => {
  try {
    const { sender_id, message } = req.body;

    const { data, error } = await supabase
      .from('broadcasts')
      .insert([{ sender_id, message }])
      .select();

    if (error) return res.status(400).json({ error: error.message });

    res.json({ success: true, message: 'Reklama yuborildi' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SERVER ISHGA TUSHURISHNI BASHLASH
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server http://localhost:${PORT} da ishlayapti`);
});

module.exports = { app, supabase };
