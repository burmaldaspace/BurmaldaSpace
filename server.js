const express = require('express');
const nodemailer = require('nodemailer');

const app = express();

// ============================================
// 📦 ПОДКЛЮЧЕНИЕ ОБРАБОТКИ ЗАПРОСОВ
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/frontend'));

// ============================================
// 📧 НАСТРОЙКА ОТПРАВКИ ПИСЕМ (MAIL.RU)
// ============================================
const transporter = nodemailer.createTransport({
    host: 'smtp.mail.ru',
    port: 465,
    secure: true,
    auth: {
        user: 'burmaldaspace-sms@mail.ru',
        pass: 'um60DukCi0PEuqv4T7Ca'
    }
});

// ============================================
// 🏠 ГЛАВНАЯ СТРАНИЦА
// ============================================
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: __dirname + '/frontend' });
});

// ============================================
// 📝 РЕГИСТРАЦИЯ
// ============================================
app.post('/api/register', async (req, res) => {
    try {
        const name = req.body.name;
        const email = req.body.Email;
        const password = req.body.Password;

        console.log('📦 Тело запроса:', req.body);

        if (!name || !email || !password) {
            return res.status(400).json({
                status: 400,
                message: 'Заполните все поля!'
            });
        }

        // Здесь будет код для отправки письма
        await transporter.sendMail({
            from: 'burmaldaspace-sms@mail.ru',
            to: email,
            subject: 'Код подтверждения для BurmaldaSpace',
            html: `
                <h1>Код подтверждения</h1>
                <p>Ваш код: <strong>123456</strong></p>
                <p>Код действует 10 минут.</p>
            `
        });

        return res.status(200).json({
            status: 200,
            message: 'Код подтверждения отправлен на почту!'
        });

    } catch (error) {
        console.error('❌ Ошибка:', error);
        return res.status(500).json({
            status: 500,
            message: 'Ошибка сервера'
        });
    }
});

// ============================================
// 🔑 ВХОД
// ============================================
app.post('/api/login', async (req, res) => {
    try {
        const email = req.body.Email;
        const password = req.body.Password;

        console.log('📦 Вход:', req.body);

        if (!email || !password) {
            return res.status(400).json({
                status: 400,
                message: 'Заполните все поля!'
            });
        }

        // Здесь будет проверка пользователя в БД

        return res.status(200).json({
            status: 200,
            message: 'Вход выполнен успешно!'
        });

    } catch (error) {
        console.error('❌ Ошибка:', error);
        return res.status(500).json({
            status: 500,
            message: 'Ошибка сервера'
        });
    }
});

// ============================================
// 🚀 ЗАПУСК СЕРВЕРА
// ============================================
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
});
