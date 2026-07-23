require('dotenv').config();

const express = require('express');
const sqlite3 = require('sqlite3');
const cors = require('cors');
const Unisender = require('unisender');

const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// 📦 ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ
// ============================================
const db = new sqlite3.Database('./burmalda.db');

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            verificationCode TEXT,
            isVerified INTEGER DEFAULT 0
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price INTEGER NOT NULL,
            rarity TEXT NOT NULL,
            image TEXT
        )
    `);
});

// ============================================
// 📧 НАСТРОЙКА ОТПРАВКИ ПИСЕМ (UNISENDER API)
// ============================================
const UNISENDER_API_KEY = process.env.UNISENDER_API_KEY || '691u9sjq9fob18xpth1ug3tt5xwj4o4m4y3smp9a';
const unisender = new Unisender(UNISENDER_API_KEY);

async function sendCode(email, code) {
    console.log(`📤 Пытаюсь отправить письмо на ${email} с кодом ${code}`);
    
    try {
        const result = await unisender.sendEmail({
            to: email,
            from: 'burmaldaspace@gmail.com', // 👈 ЗДЕСЬ ТВОЯ ПОЧТА
            subject: 'Код подтверждения для BurmaldaSpace',
            body: `
                <h1>Код подтверждения</h1>
                <p>Ваш код: <strong>${code}</strong></p>
                <p>Код действует 10 минут.</p>
            `
        });
        
        console.log('✅ Письмо отправлено через UniSender!');
        console.log('📋 Ответ:', result);
        return true;
    } catch (error) {
        console.log('❌ Ошибка UniSender:', error);
        return false;
    }
}

// ============================================
// 📝 РЕГИСТРАЦИЯ
// ============================================
app.post('/register', async (req, res) => {
    console.log('📝 Получен запрос на регистрацию');
    console.log('📦 Данные:', req.body);
    
    const email = req.body.Email;
    const password = req.body.Password;
    const name = req.body.name;

    if (!email || !password || !name) {
        return res.status(400).json({ message: 'Заполните все поля!' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], async function(err, user) {
        if (err) {
            console.error('❌ Ошибка БД:', err);
            return res.status(500).json({ message: 'Ошибка базы данных' });
        }
        
        if (user) {
            return res.status(400).json({ 
                message: '❌ Пользователь с таким email уже существует!' 
            });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();

        db.run(
            'INSERT INTO users (name, email, password, verificationCode) VALUES (?, ?, ?, ?)',
            [name, email, password, code],
            async function(err) {
                if (err) {
                    console.error('❌ Ошибка вставки:', err);
                    return res.status(500).json({ message: 'Ошибка сохранения' });
                }

                console.log(`✅ Пользователь ${name} сохранён (ID: ${this.lastID})`);
                console.log(`🔑 Сгенерирован код: ${code}`);

                await sendCode(email, code);

                res.json({
                    message: 'Код подтверждения отправлен на почту!',
                    redirect: './index.html'
                });
            }
        );
    });
});

// ============================================
// 🔑 ВХОД
// ============================================
app.post('/login', (req, res) => {
    const email = req.body.Email;
    const password = req.body.Password;

    db.get('SELECT * FROM users WHERE email = ?', [email], function(err, user) {
        if (err) {
            console.error('❌ Ошибка БД:', err);
            return res.status(500).json({ message: 'Ошибка базы данных' });
        }

        if (!user) {
            return res.status(404).json({ 
                message: '❌ Такого email нет в базе! Зарегистрируйтесь!' 
            });
        }

        if (user.password !== password) {
            return res.status(401).json({ 
                message: '❌ Неверный пароль! Попробуйте снова.' 
            });
        }

        console.log(`✅ Пользователь ${user.name} вошел в систему`);
        res.json({
            success: true,
            name: user.name,
            email: user.email,
            redirect: './index.html'
        });
    });
});

// ============================================
// ✅ ПРОВЕРКА КОДА
// ============================================
app.post('/verify', (req, res) => {
    const { email, code } = req.body;

    db.get('SELECT * FROM users WHERE email = ?', [email], function(err, user) {
        if (err) return res.status(500).json({ success: false, message: 'Ошибка БД' });
        if (!user) return res.status(404).json({ success: false, message: 'Пользователь не найден' });

        if (user.verificationCode !== code) {
            return res.json({ success: false, message: '❌ Неверный код!' });
        }

        db.run('UPDATE users SET isVerified = 1, verificationCode = NULL WHERE email = ?', [email], function(err) {
            if (err) return res.status(500).json({ success: false, message: 'Ошибка обновления' });
            res.json({ 
                success: true, 
                message: '✅ Аккаунт подтверждён!',
                redirect: './index.html'
            });
        });
    });
});

// ============================================
// 🔄 ПОВТОРНАЯ ОТПРАВКА КОДА
// ============================================
app.post('/resend-code', async (req, res) => {
    const { email } = req.body;

    db.get('SELECT * FROM users WHERE email = ?', [email], async function(err, user) {
        if (err) return res.status(500).json({ message: 'Ошибка БД' });
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        db.run('UPDATE users SET verificationCode = ? WHERE email = ?', [newCode, email], async function(err) {
            if (err) return res.status(500).json({ message: 'Ошибка обновления' });

            await sendCode(email, newCode);
            res.json({ message: '✅ Новый код отправлен на почту!' });
        });
    });
});

// ============================================
// 📦 ПОЛУЧИТЬ ТОВАРЫ
// ============================================
app.get('/products', (req, res) => {
    db.all('SELECT * FROM products', [], function(err, products) {
        if (err) return res.status(500).json({ message: 'Ошибка БД' });
        res.json(products);
    });
});

// ============================================
// 🚀 ЗАПУСК СЕРВЕРА
// ============================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
});
