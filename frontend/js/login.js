/**
 * Login Page Script
 * Authenticates users using Email and Password
 */
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const alertBox = document.getElementById('alertBox');
    const btnSubmit = document.getElementById('btnSubmit');

    // If user is already logged in, redirect them to index.html
    if (auth.isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }

    // Helper: Show Alert
    function showAlert(message, type = 'error') {
        alertBox.className = `alert alert-${type}`;
        alertBox.textContent = message;
        alertBox.style.display = 'block';
    }

    // Helper: Hide Alert
    function hideAlert() {
        alertBox.style.display = 'none';
        alertBox.textContent = '';
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            showAlert('Please enter both your email address and password.');
            return;
        }

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Signing In...';

        const result = await api.post('/auth/login', {
            email,
            password
        });

        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In with Email';

        if (result.ok && result.data.success) {
            showAlert(`Success! Welcome back, ${result.data.user.name}. Redirecting...`, 'success');
            
            // Store token and user data
            auth.setSession(result.data.token, result.data.user);

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            const errorMsg = result.data?.message || result.error || 'Invalid email or password.';
            showAlert(errorMsg, 'error');
        }
    });
});

