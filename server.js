const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
// 🏠 ПРОВЕРКА, ЧТО СЕРВЕР РАБОТАЕТ
// ============================================
app.get('/', (req, res) => {
    res.json({ message: '✅ Сервер BurmaldaSpace работает!' });
});

// ============================================
// 📝 РЕГИСТРАЦИЯ
// ============================================
app.post('/api/register', async (req, res) => {
    try {
        const { name, Email, Password } = req.body;

        console.log('📦 Тело запроса:', req.body);

        if (!name || !Email || !Password) {
            return res.status(400).json({
                status: 400,
                message: 'Заполните все поля!'
            });
        }

        // ТУТ БУДЕТ ОТПРАВКА ПИСЬМА
        await transporter.sendMail({
            from: 'burmaldaspace-sms@mail.ru',
            to: Email,
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
// 🚀 ЗАПУСК СЕРВЕРА
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
});
