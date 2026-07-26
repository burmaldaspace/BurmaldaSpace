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
// 🛒 СПИСОК ТОВАРОВ
// Чтобы добавить товар — просто добавь строку в этот массив и запушь на GitHub.
// Render сам передеплоит сервер, и товар появится на сайте.
// image — имя файла из папки /images (например: images/knife.png на фронтенде)
// ============================================
const PRODUCTS = [
    { name: 'Мясник', price: 1500, rarity: 'Легендарный', image: 'myasnik.png' },
    { name: 'Огненный клинок', price: 900, rarity: 'Редкий', image: 'fire-blade.png' },
    { name: 'Звёздный нож', price: 700, rarity: 'Необычный', image: 'star-knife.png' },
    // 👇 сюда добавляй новые товары по этому же образцу
    // { name: 'Название', price: 1000, rarity: 'Редкость', image: 'файл.png' },
];

// Пересоздаём таблицу товаров при каждом запуске — берём список ровно из PRODUCTS выше
db.serialize(() => {
    db.run('DELETE FROM products', [], (err) => {
        if (err) return console.error('❌ Ошибка очистки товаров:', err);

        const stmt = db.prepare('INSERT INTO products (name, price, rarity, image) VALUES (?, ?, ?, ?)');
        PRODUCTS.forEach(p => {
            stmt.run(p.name, p.price, p.rarity, p.image);
        });
        stmt.finalize(() => {
            console.log(`✅ Загружено товаров: ${PRODUCTS.length}`);
        });
    });
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
// ➕ ДОБАВИТЬ ТОВАР (для admin.html)
// ============================================
app.post('/products/add', (req, res) => {
    const { name, price, rarity, image } = req.body;

    if (!name || !price) {
        return res.status(400).json({ success: false, message: 'Укажите название и цену' });
    }

    db.run(
        'INSERT INTO products (name, price, rarity, image) VALUES (?, ?, ?, ?)',
        [name, price, rarity || 'Common', image || ''],
        function(err) {
            if (err) {
                console.error('❌ Ошибка добавления товара:', err);
                return res.status(500).json({ success: false, message: 'Ошибка базы данных' });
            }
            console.log(`✅ Товар "${name}" добавлен (ID: ${this.lastID})`);
            res.json({ success: true, id: this.lastID });
        }
    );
});

// ============================================
// 🗑️ УДАЛИТЬ ТОВАР (для admin.html)
// ============================================
app.delete('/products/:id', (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('❌ Ошибка удаления товара:', err);
            return res.status(500).json({ success: false, message: 'Ошибка базы данных' });
        }
        console.log(`🗑️ Товар ID ${id} удалён`);
        res.json({ success: true });
    });
});

// ============================================
// ➕ ДОБАВИТЬ ТОВАР (для себя, без формы — через запрос)
// ============================================
app.post('/products/add', (req, res) => {
    const { name, price, rarity, image } = req.body;

    if (!name || !price || !rarity) {
        return res.status(400).json({ message: 'Заполните name, price, rarity!' });
    }

    db.run(
        'INSERT INTO products (name, price, rarity, image) VALUES (?, ?, ?, ?)',
        [name, price, rarity, image || ''],
        function(err) {
            if (err) {
                console.error('❌ Ошибка добавления товара:', err);
                return res.status(500).json({ message: 'Ошибка сохранения' });
            }
            console.log(`✅ Товар "${name}" добавлен (ID: ${this.lastID})`);
            res.json({ success: true, id: this.lastID });
        }
    );
});

// ============================================
// 🗑️ УДАЛИТЬ ТОВАР ПО ID
// ============================================
app.delete('/products/:id', (req, res) => {
    db.run('DELETE FROM products WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ message: 'Ошибка удаления' });
        res.json({ success: true, deleted: this.changes });
    });
});

// ============================================
// 🚀 ЗАПУСК СЕРВЕРА
// ============================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
});
