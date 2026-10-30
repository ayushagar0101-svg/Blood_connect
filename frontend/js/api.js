/**
 * BloodConnect API Service Helper
 * Handles all AJAX/Fetch HTTP requests to the backend server
 */
const api = {
    /**
     * Send a GET request
     * @param {string} endpoint - Path after /api (e.g. '/health')
     */
    async get(endpoint) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            return {
                ok: response.ok,
                status: response.status,
                data
            };
        } catch (error) {
            console.error('API GET Error:', error);
            return {
                ok: false,
                status: 500,
                error: error.message || 'Network error or backend server is not running.'
            };
        }
    },

    /**
     * Send a POST request
     * @param {string} endpoint - Path after /api (e.g. '/auth/login')
     * @param {object} body - JSON payload
     */
    async post(endpoint, body) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            return {
                ok: response.ok,
                status: response.status,
                data
            };
        } catch (error) {
            console.error('API POST Error:', error);
            return {
                ok: false,
                status: 500,
                error: error.message || 'Network error or backend server is not running.'
            };
        }
    }
};

