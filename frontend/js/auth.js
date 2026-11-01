/**
 * BloodConnect Authentication Helper
 * Manages JWT tokens, user session storage, and dynamic navbar state
 */
const auth = {
    TOKEN_KEY: 'bloodconnect_token',
    USER_KEY: 'bloodconnect_user',

    getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    },

    getUser() {
        const user = localStorage.getItem(this.USER_KEY);
        try {
            return user ? JSON.parse(user) : null;
        } catch (e) {
            return null;
        }
    },

    setSession(token, user) {
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    },

    clearSession() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
    },

    isAuthenticated() {
        return !!this.getToken();
    },

    logout() {
        this.clearSession();
        window.location.href = '/frontend/login.html';
    },

    /**
     * Updates navbar with User info or Login/Register buttons
     */
    initNavbar() {
        const navAuthContainer = document.getElementById('navAuthLinks');
        if (!navAuthContainer) return;

        const user = this.getUser();

        if (user && this.isAuthenticated()) {
            const roleBadgeClass = user.role === 'hospital' 
                ? 'badge-hospital' 
                : user.role === 'admin' 
                    ? 'badge-admin' 
                    : 'badge-donor';

            navAuthContainer.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 14px; font-weight: 600; color: var(--secondary);">
                            👤 ${user.name}
                        </span>
                        <span class="role-pill ${roleBadgeClass}">
                            ${user.role.toUpperCase()}
                        </span>
                    </div>
                    <button id="btnLogout" class="btn btn-secondary" style="padding: 6px 14px; font-size: 13px;">
                        Logout
                    </button>
                </div>
            `;

            const btnLogout = document.getElementById('btnLogout');
            if (btnLogout) {
                btnLogout.addEventListener('click', () => {
                    auth.logout();
                });
            }
        } else {
            navAuthContainer.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <a href="login.html" class="btn btn-secondary" style="padding: 8px 16px; font-size: 14px;">
                        Sign In
                    </a>
                    <a href="register.html" class="btn btn-primary" style="padding: 8px 16px; font-size: 14px;">
                        Register
                    </a>
                </div>
            `;
        }
    }
};

// Auto-initialize navbar on DOM load
document.addEventListener('DOMContentLoaded', () => {
    auth.initNavbar();
});

