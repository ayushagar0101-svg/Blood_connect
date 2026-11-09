/**
 * BloodConnect Authentication Helper
 * Manages JWT tokens, user session storage, and dynamic navbar state
 * Uses professional monochromatic Font Awesome icons
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
        const isInSubfolder = window.location.pathname.includes('/donor/') || window.location.pathname.includes('/requester/');
        window.location.href = isInSubfolder ? '../login.html' : 'login.html';
    },

    /**
     * Updates navbar with User info or Login/Register buttons
     */
    initNavbar() {
        const navAuthContainer = document.getElementById('navAuthLinks');
        if (!navAuthContainer) return;

        const user = this.getUser();
        const isInSubfolder = window.location.pathname.includes('/donor/') || window.location.pathname.includes('/requester/');
        const donorPortalPath = isInSubfolder ? 'dashboard.html' : 'donor/dashboard.html';
        const loginPath = isInSubfolder ? '../login.html' : 'login.html';
        const registerPath = isInSubfolder ? '../register.html' : 'register.html';

        if (user && this.isAuthenticated()) {
            const roleBadgeClass = user.role === 'hospital' 
                ? 'badge-hospital' 
                : user.role === 'admin' 
                    ? 'badge-admin' 
                    : 'badge-donor';

            const roleIcon = user.role === 'hospital'
                ? 'fa-hospital'
                : user.role === 'requester'
                    ? 'fa-hospital-user'
                    : 'fa-hand-holding-droplet';

            const donorPortalBtn = (user.role === 'donor')
                ? `<a href="${donorPortalPath}" class="btn btn-primary" style="padding: 6px 14px; font-size: 13px;">
                     <i class="fa-solid fa-gauge-high"></i> Donor Portal
                   </a>`
                : '';

            navAuthContainer.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 14px; font-weight: 600; color: var(--secondary); display: inline-flex; align-items: center; gap: 6px;">
                            <i class="fa-solid fa-circle-user"></i> ${user.name}
                        </span>
                        <span class="role-pill ${roleBadgeClass}">
                            <i class="fa-solid ${roleIcon}"></i> ${user.role.toUpperCase()}
                        </span>
                    </div>
                    ${donorPortalBtn}
                    <button id="btnLogout" class="btn btn-secondary" style="padding: 6px 14px; font-size: 13px;">
                        <i class="fa-solid fa-arrow-right-from-bracket"></i> Logout
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
                    <a href="${loginPath}" class="btn btn-secondary" style="padding: 8px 16px; font-size: 14px;">
                        <i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In
                    </a>
                    <a href="${registerPath}" class="btn btn-primary" style="padding: 8px 16px; font-size: 14px;">
                        <i class="fa-solid fa-user-plus"></i> Register
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
