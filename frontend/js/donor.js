/**
 * Donor Portal Script
 * Handles profile management, GPS coordinate detection, medical screening, and availability toggles
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Auth Guard: Verify user is logged in and has role 'donor'
    if (!auth.isAuthenticated()) {
        window.location.href = '../login.html';
        return;
    }

    const currentUser = auth.getUser();
    if (!currentUser || currentUser.role !== 'donor') {
        alert('Access denied. The Donor Portal is restricted to registered donors.');
        window.location.href = '../index.html';
        return;
    }

    // DOM Elements
    const alertBox = document.getElementById('alertBox');
    const statBloodGroup = document.getElementById('statBloodGroup');
    const statEligibility = document.getElementById('statEligibility');
    const statCooldown = document.getElementById('statCooldown');
    const availabilityToggle = document.getElementById('availabilityToggle');
    const availabilityText = document.getElementById('availabilityText');
    const profileStatusBadge = document.getElementById('profileStatusBadge');
    const lastUpdatedNotice = document.getElementById('lastUpdatedNotice');

    const donorProfileForm = document.getElementById('donorProfileForm');
    const bloodGroupSelect = document.getElementById('bloodGroup');
    const componentTypeSelect = document.getElementById('componentType');
    const genderSelect = document.getElementById('gender');
    const dateOfBirthInput = document.getElementById('dateOfBirth');
    const calculatedAgeNotice = document.getElementById('calculatedAgeNotice');
    const weightKgInput = document.getElementById('weightKg');
    const cityInput = document.getElementById('city');
    const pincodeInput = document.getElementById('pincode');
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');
    const btnDetectLocation = document.getElementById('btnDetectLocation');
    const btnSaveProfile = document.getElementById('btnSaveProfile');

    // Checklist inputs
    const checkHealth = document.getElementById('checkHealth');
    const checkTattoo = document.getElementById('checkTattoo');
    const checkSurgery = document.getElementById('checkSurgery');
    const checkChronic = document.getElementById('checkChronic');
    const checkPastDonation = document.getElementById('checkPastDonation');

    // Helper: Show Alert
    function showAlert(message, type = 'error') {
        alertBox.className = `alert alert-${type}`;
        alertBox.textContent = message;
        alertBox.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Helper: Hide Alert
    function hideAlert() {
        alertBox.style.display = 'none';
        alertBox.textContent = '';
    }

    // Calculate Age helper
    function calculateAge(dobString) {
        if (!dobString) return null;
        const dob = new Date(dobString);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            age--;
        }
        return age;
    }

    // Live Age Calculation on DOB change
    dateOfBirthInput.addEventListener('change', () => {
        const age = calculateAge(dateOfBirthInput.value);
        if (age !== null && !isNaN(age)) {
            if (age < 18) {
                calculatedAgeNotice.innerHTML = `<span style="color: var(--danger); font-weight: 600;"><i class="fa-solid fa-triangle-exclamation"></i> Age: ${age} years. Donors must be at least 18 years old.</span>`;
            } else if (age > 65) {
                calculatedAgeNotice.innerHTML = `<span style="color: var(--danger); font-weight: 600;"><i class="fa-solid fa-triangle-exclamation"></i> Age: ${age} years. Donors must be under 65 years old.</span>`;
            } else {
                calculatedAgeNotice.innerHTML = `<span style="color: var(--success); font-weight: 600;"><i class="fa-solid fa-check"></i> Age: ${age} years (Eligible).</span>`;
            }
        }
    });

    // GPS Geolocation Detector
    btnDetectLocation.addEventListener('click', () => {
        if (!navigator.geolocation) {
            showAlert('Geolocation is not supported by your browser.', 'error');
            return;
        }

        btnDetectLocation.disabled = true;
        btnDetectLocation.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Detecting GPS...';

        navigator.geolocation.getCurrentPosition(
            (position) => {
                latitudeInput.value = position.coords.latitude.toFixed(6);
                longitudeInput.value = position.coords.longitude.toFixed(6);
                btnDetectLocation.disabled = false;
                btnDetectLocation.innerHTML = '<i class="fa-solid fa-check"></i> Location Captured';
                setTimeout(() => {
                    btnDetectLocation.innerHTML = '<i class="fa-solid fa-crosshairs"></i> Auto-Detect My GPS Location';
                }, 3000);
            },
            (error) => {
                btnDetectLocation.disabled = false;
                btnDetectLocation.innerHTML = '<i class="fa-solid fa-crosshairs"></i> Auto-Detect My GPS Location';
                showAlert(`Unable to retrieve GPS coordinates: ${error.message}. You can continue by entering your City and Pincode.`, 'error');
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    });

    // Fetch Profile from Backend
    async function loadDonorProfile() {
        hideAlert();
        const result = await api.get('/donor/profile');

        if (result.ok && result.data.success && result.data.profile) {
            const p = result.data.profile;

            // Stats Bar
            statBloodGroup.textContent = p.blood_group;
            statEligibility.textContent = p.isEligible ? 'Eligible to Donate' : 'Cooldown Active';
            statEligibility.style.color = p.isEligible ? 'var(--success)' : 'var(--warning)';
            statCooldown.textContent = `${p.cooldownDaysRemaining || 0} Days`;

            // Availability Switch
            availabilityToggle.disabled = !p.isEligible;
            availabilityToggle.checked = (p.availability_status === 'available');
            availabilityText.textContent = (p.availability_status === 'available') ? 'Available' : 'Busy';
            availabilityText.style.color = (p.availability_status === 'available') ? 'var(--success)' : 'var(--text-secondary)';

            // Profile Badge
            profileStatusBadge.className = 'badge-status badge-success';
            profileStatusBadge.innerHTML = '<i class="fa-solid fa-check"></i> Profile Completed';

            // Pre-fill Form
            bloodGroupSelect.value = p.blood_group || '';
            componentTypeSelect.value = p.component_type || 'whole_blood';
            genderSelect.value = p.gender || '';
            if (p.date_of_birth) {
                dateOfBirthInput.value = p.date_of_birth.substring(0, 10);
                dateOfBirthInput.dispatchEvent(new Event('change'));
            }
            weightKgInput.value = p.weight_kg || '';
            cityInput.value = p.city || '';
            pincodeInput.value = p.pincode || '';
            latitudeInput.value = p.latitude || '';
            longitudeInput.value = p.longitude || '';

            // Checkboxes
            checkHealth.checked = true;
            checkTattoo.checked = true;
            checkSurgery.checked = true;
            checkChronic.checked = true;
            checkPastDonation.checked = true;

            if (p.updated_at) {
                const updatedDate = new Date(p.updated_at).toLocaleDateString();
                lastUpdatedNotice.textContent = `Profile last updated: ${updatedDate}`;
            }

        } else {
            // Profile not created yet
            statBloodGroup.textContent = 'Not Set';
            statEligibility.textContent = 'Setup Required';
            statEligibility.style.color = 'var(--text-secondary)';
            statCooldown.textContent = '0 Days';
            availabilityToggle.disabled = true;
            availabilityToggle.checked = false;
            availabilityText.textContent = 'Setup Required';
            profileStatusBadge.className = 'badge-status badge-pending';
            profileStatusBadge.innerHTML = '<i class="fa-solid fa-clock"></i> Incomplete';
        }
    }

    // Availability Toggle Handler
    availabilityToggle.addEventListener('change', async () => {
        const newStatus = availabilityToggle.checked ? 'available' : 'busy';
        availabilityText.textContent = 'Updating...';

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/donor/availability`, {
                method: 'PATCH',
                headers: api.getHeaders(),
                body: JSON.stringify({ status: newStatus })
            });
            const data = await response.json();

            if (response.ok && data.success) {
                availabilityText.textContent = (newStatus === 'available') ? 'Available' : 'Busy';
                availabilityText.style.color = (newStatus === 'available') ? 'var(--success)' : 'var(--text-secondary)';
                showAlert(`Directory availability updated to: ${newStatus.toUpperCase()}`, 'success');
            } else {
                availabilityToggle.checked = !availabilityToggle.checked;
                availabilityText.textContent = availabilityToggle.checked ? 'Available' : 'Busy';
                showAlert(data.message || 'Failed to update availability status.', 'error');
            }
        } catch (error) {
            availabilityToggle.checked = !availabilityToggle.checked;
            showAlert('Network error updating availability.', 'error');
        }
    });

    // Form Submission
    donorProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();

        const blood_group = bloodGroupSelect.value;
        const component_type = componentTypeSelect.value;
        const gender = genderSelect.value;
        const date_of_birth = dateOfBirthInput.value;
        const weight_kg = parseFloat(weightKgInput.value);
        const city = cityInput.value.trim();
        const pincode = pincodeInput.value.trim();
        const latitude = latitudeInput.value ? parseFloat(latitudeInput.value) : null;
        const longitude = longitudeInput.value ? parseFloat(longitudeInput.value) : null;

        // Age Verification
        const age = calculateAge(date_of_birth);
        if (age === null || age < 18 || age > 65) {
            showAlert('You must be between 18 and 65 years old to donate blood.', 'error');
            return;
        }

        // Weight Verification
        if (isNaN(weight_kg) || weight_kg < 50) {
            showAlert('Donors must weigh at least 50 kg for medical safety.', 'error');
            return;
        }

        // Medical Questionnaire Verification
        const screeningPassed = checkHealth.checked && checkTattoo.checked && checkSurgery.checked && checkChronic.checked && checkPastDonation.checked;
        if (!screeningPassed) {
            showAlert('You must confirm all medical screening questions to complete your profile.', 'error');
            return;
        }

        btnSaveProfile.disabled = true;
        btnSaveProfile.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving Profile...';

        const result = await api.post('/donor/profile', {
            blood_group,
            component_type,
            gender,
            date_of_birth,
            weight_kg,
            city,
            pincode,
            latitude,
            longitude,
            screening_passed: true
        });

        btnSaveProfile.disabled = false;
        btnSaveProfile.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save &amp; Update Donor Profile';

        if (result.ok && result.data.success) {
            showAlert(result.data.message || 'Profile saved successfully!', 'success');
            await loadDonorProfile();
        } else {
            const errorMsg = result.data?.message || result.error || 'Failed to save donor profile.';
            showAlert(errorMsg, 'error');
        }
    });

    // Initial Load
    await loadDonorProfile();
});

