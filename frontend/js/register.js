/**
 * Registration Page Script
 */
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const roleTabs = document.querySelectorAll('.role-tab-btn');
    const selectedRoleInput = document.getElementById('selectedRole');
    const alertBox = document.getElementById('alertBox');
    const btnSubmit = document.getElementById('btnSubmit');

    // Role Tab Selector
    roleTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            roleTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            selectedRoleInput.value = tab.getAttribute('data-role');
        });
    });

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

    // Handle Form Submit
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const role = selectedRoleInput.value;

        // Validation
        if (!name || !email || !phone || !password || !confirmPassword) {
            showAlert('Please fill in all required fields.');
            return;
        }

        if (password !== confirmPassword) {
            showAlert('Passwords do not match. Please re-enter.');
            return;
        }

        if (password.length < 6) {
            showAlert('Password must be at least 6 characters long.');
            return;
        }

        // Disable button during request
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Creating Account...';

        const result = await api.post('/auth/register', {
            name,
            email,
            phone,
            password,
            role
        });

        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Account';

        if (result.ok && result.data.success) {
            showAlert('Registration successful! Redirecting to Sign In...', 'success');
            registerForm.reset();
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            const errorMsg = result.data?.message || result.error || 'Registration failed. Please try again.';
            showAlert(errorMsg, 'error');
        }
    });
});

