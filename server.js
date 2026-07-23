const registerBtn = document.getElementById('register-btn');
const registerSection = document.getElementById('register-section');
const verifySection = document.getElementById('verify-section');
const regError = document.getElementById('reg-error');

let currentEmail = '';

registerBtn.addEventListener('click', async () => {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    regError.textContent = '';

    if (!name || !email || !password) {
        regError.textContent = 'Заполните все поля!';
        return;
    }

    if (password.length < 8) {
        regError.textContent = 'Пароль должен быть не менее 8 символов!';
        return;
    }

    try {
        const response = await fetch('https://burmaldaspaceaa.onrender.com/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, Email: email, Password: password })
        });

        const data = await response.json();

        if (response.ok) {
            currentEmail = email;
            registerSection.style.display = 'none';
            verifySection.style.display = 'block';
            document.getElementById('user-email-display').textContent = email;
            localStorage.setItem('userEmail', email);
            alert('✅ Код подтверждения отправлен на вашу почту! Проверьте почту (и папку Спам).');
        } else {
            regError.textContent = data.message || 'Ошибка регистрации';
        }
    } catch (error) {
        regError.textContent = 'Ошибка соединения с сервером.';
        console.error('Ошибка:', error);
    }
});

// ============================================
// ✅ АВТО-ПЕРЕКЛЮЧЕНИЕ И ПРОВЕРКА КОДА
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const codeInputs = document.querySelectorAll('.code-box');
    if (codeInputs.length === 0) return;

    codeInputs.forEach((input, index) => {
        input.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
            if (this.value.length === 1 && index < codeInputs.length - 1) {
                codeInputs[index + 1].focus();
                codeInputs[index + 1].select();
            }
        });

        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && this.value === '' && index > 0) {
                codeInputs[index - 1].focus();
                codeInputs[index - 1].select();
            }
        });
    });

    const verifyBtn = document.getElementById('verify-btn');
    const errorMessage = document.getElementById('error-message');
    const userEmailDisplay = document.getElementById('user-email-display');

    const savedEmail = localStorage.getItem('userEmail');
    if (userEmailDisplay && savedEmail) {
        userEmailDisplay.textContent = savedEmail;
    }

    if (verifyBtn) {
        verifyBtn.addEventListener('click', async function() {
            let code = '';
            codeInputs.forEach(input => code += input.value);

            const email = localStorage.getItem('userEmail');
            if (!email) {
                alert('❌ Email не найден. Попробуйте зарегистрироваться снова.');
                return;
            }

            if (code.length !== 6) {
                errorMessage.textContent = '❌ Введите все 6 цифр!';
                errorMessage.style.display = 'block';
                return;
            }

            try {
                const response = await fetch('https://burmaldaspaceaa.onrender.com/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, code })
                });
                const data = await response.json();

                if (data.success) {
                    alert('✅ Аккаунт подтверждён!');
                    window.location.href = './index.html';
                } else {
                    errorMessage.textContent = '❌ ' + data.message;
                    errorMessage.style.display = 'block';
                }
            } catch (error) {
                alert('❌ Ошибка: ' + error.message);
            }
        });
    }

    // Автоматическая проверка при заполнении всех полей
    codeInputs.forEach(input => {
        input.addEventListener('input', function() {
            const allFilled = Array.from(codeInputs).every(inp => inp.value.length === 1);
            if (allFilled && verifyBtn) {
                setTimeout(() => verifyBtn.click(), 300);
            }
        });
    });
});