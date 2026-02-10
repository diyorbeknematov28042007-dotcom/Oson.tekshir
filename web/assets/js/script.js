const API_URL = 'http://localhost:3000/api';

let currentUser = {
    telegram_id: null,
    username: null,
    fullName: null
};

let currentTest = {
    id: null,
    code: null,
    subject: null,
    count: 0,
    scoring: 'general',
    questions: [],
    currentQuestion: 0,
    userAnswers: []
};

// ==============
// PAGE NAVIGATION
// ==============

function showPage(pageName) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageName).classList.add('active');
}

function goBack() {
    showPage('testPage');
}

function goToHome() {
    showPage('loginPage');
    currentTest = { currentQuestion: 0, userAnswers: [] };
}

function retakeTest() {
    showPage('testPage');
}

// ==============
// LOGIN
// ==============

function startTest() {
    const fullName = document.getElementById('fullName').value.trim();
    
    if (!fullName) {
        alert('⚠️ Iltimos, ismingizni kiriting!');
        return;
    }

    currentUser.fullName = fullName;
    document.getElementById('userGreeting').textContent = `👋 Salom, ${fullName}!`;
    showPage('testPage');
}

// ==============
// TEST LOADING
// ==============

function loadTest() {
    const subject = document.getElementById('subject').value;
    const testCode = document.getElementById('testCode').value;
    const testCount = parseInt(document.getElementById('testCount').value);
    const scoring = document.querySelector('input[name="scoring"]:checked').value;

    if (!subject || !testCode || !testCount) {
        alert('⚠️ Barcha maydonlarni to\'ldiring!');
        return;
    }

    if (testCode.length !== 2 || isNaN(testCode)) {
        alert('⚠️ Test kodi 2 xonali raqam bo\'lishi kerak!');
        return;
    }

    if (testCount < 10 || testCount > 90) {
        alert('⚠️ Test soni 10 dan 90 gacha bo\'lishi kerak!');
        return;
    }

    currentTest.subject = subject;
    currentTest.code = testCode;
    currentTest.count = testCount;
    currentTest.scoring = scoring;
    currentTest.currentQuestion = 0;
    currentTest.userAnswers = [];

    // Fake test ma'lumotlarini yaratish (haqiqiy ma'lumotlar serverdan keladì)
    generateMockTest();
    displayQuiz();
}

function generateMockTest() {
    currentTest.questions = [];
    const subjects = {
        'Huquq': ['Konstitutsiya nima?', 'Qonun nima?', 'Shaxs huquqlari nima?'],
        'Chet tili': ['What is hello in English?', 'How are you?', 'What is your name?'],
        'IQ': ['2 + 2 = ?', '3 * 4 = ?', '10 - 5 = ?'],
        'Fizika': ['Gravitatsiya nima?', 'Tezlik nima?', 'Kuch nima?'],
        'Matematika': ['5 + 5 = ?', '10 * 2 = ?', '20 / 5 = ?'],
        'Kimyo': ['H2O nima?', 'Atom nima?', 'Molekula nima?'],
        'Biologiya': ['Hujayra nima?', 'DNA nima?', 'Evolyutsiya nima?'],
        'Tarix': ['O\'zbekistan nechi yilda mustaqillik oldi?', 'Amir Temur nechi yilda tugadi?', 'Sovka nechi yilda tuzildi?']
    };

    const subjectQuestions = subjects[currentTest.subject] || [];
    
    for (let i = 0; i < currentTest.count; i++) {
        currentTest.questions.push({
            id: i + 1,
            text: subjectQuestions[i % subjectQuestions.length] + ` (${i + 1})`,
            options: ['A)', 'B)', 'C)', 'D)'],
            answer: Math.floor(Math.random() * 4)
        });
    }
}

// ==============
// QUIZ DISPLAY
// ==============

function displayQuiz() {
    const test = currentTest.questions[currentTest.currentQuestion];
    
    document.getElementById('quizTitle').textContent = 
        `${currentTest.subject} - Test kodi: ${currentTest.code}`;
    
    document.getElementById('questionCounter').textContent = 
        `Savol: ${currentTest.currentQuestion + 1} / ${currentTest.count}`;
    
    const progress = ((currentTest.currentQuestion + 1) / currentTest.count) * 100;
    document.getElementById('progressBar').style.width = progress + '%';

    const content = `
        <div class="question-item">
            <h3>${test.text}</h3>
            ${test.options.map((option, idx) => `
                <label class="option ${currentTest.userAnswers[currentTest.currentQuestion] === idx ? 'selected' : ''}">
                    <input 
                        type="radio" 
                        name="answer" 
                        value="${idx}"
                        ${currentTest.userAnswers[currentTest.currentQuestion] === idx ? 'checked' : ''}
                        onchange="selectAnswer(${idx})"
                    >
                    <span>${option}</span>
                </label>
            `).join('')}
        </div>
    `;

    document.getElementById('quizContent').innerHTML = content;
    showPage('quizPage');
}

function selectAnswer(optionIdx) {
    currentTest.userAnswers[currentTest.currentQuestion] = optionIdx;
}

function previousQuestion() {
    if (currentTest.currentQuestion > 0) {
        currentTest.currentQuestion--;
        displayQuiz();
    }
}

function nextQuestion() {
    if (currentTest.currentQuestion < currentTest.count - 1) {
        currentTest.currentQuestion++;
        displayQuiz();
    }
}

// ==============
// TEST SUBMISSION
// ==============

async function submitTest() {
    try {
        const response = await fetch(`${API_URL}/tests/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                test_id: currentTest.id,
                user_id: currentUser.telegram_id,
                username: currentUser.username,
                full_name: currentUser.fullName,
                answers: currentTest.userAnswers,
                scoring_method: currentTest.scoring
            })
        });

        const result = await response.json();

        if (response.ok) {
            displayResults(result.score, result.wrongQuestions);
        } else {
            alert('❌ Xatolik: ' + result.error);
        }
    } catch (error) {
        console.error('Xatolik:', error);
        alert('❌ Serverga ulanib bo\'lmadi');
    }
}

function displayResults(score, wrongQuestions) {
    const resultTitle = score > currentTest.count / 2 ? '🎉 Tabriktovlaymiz!' : '📚 Qayta o\'rganish tavsiya etiladi';
    
    const detailsHTML = `
        <p><strong>Fan:</strong> ${currentTest.subject}</p>
        <p><strong>Test Kodi:</strong> ${currentTest.code}</p>
        <p><strong>Jami Testlar:</strong> ${currentTest.count} ta</p>
        <p><strong>Baholash Usuli:</strong> ${currentTest.scoring === 'general' ? 'Umumiy' : 'Maxsus'}</p>
        <p><strong>To'g'ri Javoblar:</strong> ${currentTest.count - wrongQuestions.length} ta</p>
        ${wrongQuestions.length > 0 ? `<p><strong>Noto'g'ri Javoblar:</strong> ${wrongQuestions.join(', ')}</p>` : ''}
    `;

    document.getElementById('resultTitle').textContent = resultTitle;
    document.getElementById('scoreValue').textContent = score.toFixed(1);
    document.getElementById('resultDetails').innerHTML = detailsHTML;
    showPage('resultsPage');
}
