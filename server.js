// ============================================
// 🌐 ФОРСИРУЕМ ИСПОЛЬЗОВАНИЕ IPv4
// ============================================
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

require('dotenv').config();

const express = require('express');
const sqlite3 = require('sqlite3');
const cors = require('cors');

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
            isVerified INTEGER DEFAULT 1
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
// 📝 РЕГИСТРАЦИЯ (без подтверждения почты — аккаунт активен сразу)
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

        db.run(
            'INSERT INTO users (name, email, password, isVerified) VALUES (?, ?, ?, 1)',
            [name, email, password],
            function(err) {
                if (err) {
                    console.error('❌ Ошибка вставки:', err);
                    return res.status(500).json({ message: 'Ошибка сохранения' });
                }

                console.log(`✅ Пользователь ${name} сохранён (ID: ${this.lastID})`);

                res.json({
                    success: true,
                    name: name,
                    email: email,
                    message: '✅ Регистрация прошла успешно!',
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
                success: false,
                message: '❌ Такого email нет в базе! Зарегистрируйтесь!'
            });
        }

        if (user.password !== password) {
            return res.status(401).json({
                success: false,
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
