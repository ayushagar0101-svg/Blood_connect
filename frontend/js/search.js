/**
 * Smart Donor Search, Medical Compatibility & Geolocation Radius Engine
 * Powered by Haversine Distance & Leaflet.js Interactive OpenStreetMap
 */
document.addEventListener('DOMContentLoaded', () => {
    // Client-side Blood Compatibility Map (RBC)
    const COMPATIBILITY_MAP = {
        'A+': ['A+', 'A-', 'O+', 'O-'],
        'A-': ['A-', 'O-'],
        'B+': ['B+', 'B-', 'O+', 'O-'],
        'B-': ['B-', 'O-'],
        'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // Universal Recipient
        'AB-': ['AB-', 'A-', 'B-', 'O-'],
        'O+': ['O+', 'O-'],
        'O-': ['O-'],                                              // Universal Donor
        'Bombay': ['Bombay']                                       // Rare
    };

    // DOM Elements
    const smartSearchForm = document.getElementById('smartSearchForm');
    const searchBloodGroup = document.getElementById('searchBloodGroup');
    const searchComponent = document.getElementById('searchComponent');
    const searchRadius = document.getElementById('searchRadius');
    const searchCity = document.getElementById('searchCity');
    const btnUseCurrentGPS = document.getElementById('btnUseCurrentGPS');
    const searchLat = document.getElementById('searchLat');
    const searchLng = document.getElementById('searchLng');
    const gpsStatusNotice = document.getElementById('gpsStatusNotice');
    const btnSearchDonors = document.getElementById('btnSearchDonors');

    const compatibilityVisualizer = document.getElementById('compatibilityVisualizer');
    const compatPillsContainer = document.getElementById('compatPillsContainer');

    const donorResultsSection = document.getElementById('donorResultsSection');
    const donorResultsCount = document.getElementById('donorResultsCount');
    const resultsLayoutWrapper = document.getElementById('resultsLayoutWrapper');
    const btnToggleBoth = document.getElementById('btnToggleBoth');
    const btnToggleGrid = document.getElementById('btnToggleGrid');
    const btnToggleMap = document.getElementById('btnToggleMap');
    const donorResultsGrid = document.getElementById('donorResultsGrid');
    const mapContainer = document.getElementById('mapContainer');

    // Leaflet Map Instance
    let leafletMap = null;

    // 1. GPS Auto-Detect Handler for Requester
    btnUseCurrentGPS.addEventListener('click', () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }

        btnUseCurrentGPS.disabled = true;
        btnUseCurrentGPS.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Detecting...';

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude.toFixed(6);
                const lng = pos.coords.longitude.toFixed(6);
                searchLat.value = lat;
                searchLng.value = lng;
                btnUseCurrentGPS.disabled = false;
                btnUseCurrentGPS.className = 'btn btn-primary';
                btnUseCurrentGPS.innerHTML = '<i class="fa-solid fa-check"></i> GPS Active';
                gpsStatusNotice.style.display = 'block';
                gpsStatusNotice.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> Location set: (${lat}, ${lng})`;
            },
            (err) => {
                btnUseCurrentGPS.disabled = false;
                btnUseCurrentGPS.innerHTML = '<i class="fa-solid fa-crosshairs"></i> Use My Current GPS';
                alert(`GPS Detection note: ${err.message}. You can continue searching by City or Blood Group.`);
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    });

    // 2. Update Compatibility Matrix Visualizer on Blood Group selection
    function updateCompatibilityVisualizer() {
        const selectedGroup = searchBloodGroup.value;

        if (!selectedGroup) {
            compatibilityVisualizer.style.display = 'none';
            compatPillsContainer.innerHTML = '';
            return;
        }

        const compatibleList = COMPATIBILITY_MAP[selectedGroup] || [selectedGroup];
        compatibilityVisualizer.style.display = 'block';

        compatPillsContainer.innerHTML = compatibleList.map(group => {
            const isExact = (group === selectedGroup);
            const isUniversal = (group === 'O-');
            const pillClass = isExact 
                ? 'compat-pill-exact' 
                : isUniversal 
                    ? 'compat-pill-universal' 
                    : 'compat-pill-alt';

            let label = isExact ? `${group} (Exact Match)` : `${group} (Compatible)`;
            if (isUniversal && !isExact) label += ' - Universal Donor';

            return `<span class="compat-pill ${pillClass}">
                <i class="fa-solid ${isExact ? 'fa-circle-check' : 'fa-check'}"></i> ${label}
            </span>`;
        }).join('');
    }

    searchBloodGroup.addEventListener('change', updateCompatibilityVisualizer);

    // 3. Leaflet Map Initialization and Plotting (Clean Fresh Instance)
    const donorMarkersMap = new Map();

    function renderLeafletMap(donors, userLocation, radiusKm) {
        if (typeof L === 'undefined') {
            console.warn('Leaflet library is not loaded.');
            return;
        }

        const mapElement = document.getElementById('donorMap');
        if (!mapElement) return;

        // Clean up previous map instance to prevent stale/blocked tile caching
        if (leafletMap) {
            leafletMap.remove();
            leafletMap = null;
        }
        donorMarkersMap.clear();

        const defaultCenter = [26.2183, 78.1828]; // Gwalior default
        leafletMap = L.map('donorMap', {
            center: defaultCenter,
            zoom: 12
        });

        // 1. High-Performance Esri World Street Map Layer (Backed by Enterprise CDN, never blocks localhost)
        const esriStreetLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS'
        });

        // 2. High-Performance CartoDB Voyager Layer
        const cartoVoyagerLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd',
            attribution: '&copy; CARTO &copy; OpenStreetMap'
        });

        // Add default street layer
        esriStreetLayer.addTo(leafletMap);

        // Add layer switcher control
        L.control.layers({
            "Street Map (Fast)": esriStreetLayer,
            "Voyager Map": cartoVoyagerLayer
        }, null, { position: 'topright' }).addTo(leafletMap);

        const markersLayer = L.layerGroup().addTo(leafletMap);
        const mapBounds = [];

        // Plot User's Search Origin Pin
        if (userLocation && userLocation.lat && userLocation.lng) {
            const userLatLng = [userLocation.lat, userLocation.lng];
            mapBounds.push(userLatLng);

            const userIcon = L.divIcon({
                className: 'leaflet-user-marker',
                html: `<div class="custom-user-pin" title="Search Origin Location"><i class="fa-solid fa-crosshairs"></i></div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });

            L.marker(userLatLng, { icon: userIcon })
                .bindPopup(`<strong><i class="fa-solid fa-location-crosshairs"></i> Search Origin</strong><br>Patient Location`)
                .addTo(markersLayer);

            // Draw Radius Circle
            if (radiusKm && !isNaN(radiusKm)) {
                L.circle(userLatLng, {
                    radius: radiusKm * 1000,
                    color: '#C8102E',
                    fillColor: '#FFECEE',
                    fillOpacity: 0.12,
                    weight: 1.5,
                    dashArray: '5, 5'
                }).addTo(leafletMap);
            }
        }

        // Plot Donors on Map
        donors.forEach(donor => {
            if (donor.latitude && donor.longitude) {
                const donorLatLng = [donor.latitude, donor.longitude];
                mapBounds.push(donorLatLng);

                const donorIcon = L.divIcon({
                    className: 'leaflet-donor-marker',
                    html: `<div class="custom-map-pin" title="${donor.name} (${donor.bloodGroup})">${donor.bloodGroup}</div>`,
                    iconSize: [34, 34],
                    iconAnchor: [17, 17]
                });

                const popupContent = `
                    <div style="font-family: inherit; font-size: 13px; line-height: 1.5;">
                        <strong style="font-size: 14px; color: var(--secondary);"><i class="fa-solid fa-circle-user"></i> ${donor.name}</strong><br>
                        <span style="display: inline-block; padding: 2px 6px; background: #FFECEE; color: #C8102E; border-radius: 4px; font-weight: 700; font-size: 11px; margin: 4px 0;">
                            ${donor.bloodGroup} &bull; ${donor.matchType}
                        </span><br>
                        ${donor.distance_km !== null ? `<i class="fa-solid fa-route"></i> <strong>${donor.distance_km} km away</strong><br>` : ''}
                        <i class="fa-solid fa-location-dot"></i> ${donor.city}<br>
                        <i class="fa-solid fa-shield-halved"></i> ${donor.maskedPhone}<br>
                        <button type="button" class="btn btn-primary btn-block btn-request-donor" data-donor-id="${donor.id}" data-donor-name="${donor.name}" style="padding: 5px 10px; font-size: 11px; margin-top: 8px;">
                            <i class="fa-solid fa-paper-plane"></i> Request Blood
                        </button>
                    </div>
                `;

                const marker = L.marker(donorLatLng, { icon: donorIcon })
                    .bindPopup(popupContent)
                    .addTo(markersLayer);

                donorMarkersMap.set(donor.id, marker);
            }
        });

        // Auto-fit map to show all markers
        if (mapBounds.length > 0) {
            leafletMap.fitBounds(mapBounds, { padding: [50, 50], maxZoom: 14 });
        } else {
            leafletMap.setView(defaultCenter, 12);
        }

        // Re-calculate size to prevent blank or distorted tiles
        setTimeout(() => {
            if (leafletMap) leafletMap.invalidateSize();
        }, 100);
        setTimeout(() => {
            if (leafletMap) leafletMap.invalidateSize();
        }, 400);
    }

    // 4. View Switcher Logic: Split View (Both Default), Cards Only, Map Only
    function setViewMode(mode) {
        if (!resultsLayoutWrapper) return;

        if (mode === 'both') {
            btnToggleBoth.classList.add('active');
            btnToggleGrid.classList.remove('active');
            btnToggleMap.classList.remove('active');
            resultsLayoutWrapper.className = 'results-layout-split';
            mapContainer.style.display = 'block';
            donorResultsGrid.style.display = 'flex';
        } else if (mode === 'cards') {
            btnToggleGrid.classList.add('active');
            btnToggleBoth.classList.remove('active');
            btnToggleMap.classList.remove('active');
            resultsLayoutWrapper.className = 'results-layout-cards-only';
            mapContainer.style.display = 'none';
            donorResultsGrid.style.display = 'grid';
        } else if (mode === 'map') {
            btnToggleMap.classList.add('active');
            btnToggleBoth.classList.remove('active');
            btnToggleGrid.classList.remove('active');
            resultsLayoutWrapper.className = 'results-layout-map-only';
            mapContainer.style.display = 'block';
            donorResultsGrid.style.display = 'none';
        }

        if (leafletMap && (mode === 'both' || mode === 'map')) {
            setTimeout(() => {
                leafletMap.invalidateSize();
            }, 100);
        }
    }

    btnToggleBoth?.addEventListener('click', () => setViewMode('both'));
    btnToggleGrid?.addEventListener('click', () => setViewMode('cards'));
    btnToggleMap?.addEventListener('click', () => setViewMode('map'));

    // 5. Execute Smart Search with Haversine Geolocation
    smartSearchForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const blood_group = searchBloodGroup.value;
        const component = searchComponent.value;
        const radius = searchRadius.value;
        const city = searchCity.value.trim();
        const lat = searchLat.value;
        const lng = searchLng.value;

        if (!blood_group) {
            alert('Please select a recipient blood group to search.');
            return;
        }

        btnSearchDonors.disabled = true;
        btnSearchDonors.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Searching Donors...';
        donorResultsSection.style.display = 'block';

        // Set default to show Both Map and Cards
        setViewMode('both');

        donorResultsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px 0; color: var(--text-secondary);">
                <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 28px; margin-bottom: 12px; display: block; color: var(--primary);"></i>
                Finding compatible donors near you...
            </div>
        `;

        try {
            let endpoint = `/donor/search?blood_group=${encodeURIComponent(blood_group)}`;
            if (component) endpoint += `&component=${encodeURIComponent(component)}`;
            if (city) endpoint += `&city=${encodeURIComponent(city)}`;
            if (lat && lng) {
                endpoint += `&lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`;
                if (radius) endpoint += `&radius=${encodeURIComponent(radius)}`;
            }

            const result = await api.get(endpoint);

            btnSearchDonors.disabled = false;
            btnSearchDonors.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Find Nearest Compatible Donors';

            if (result.ok && result.data.success) {
                const donors = result.data.donors;
                const total = donors.length;
                donorResultsCount.textContent = `${total} Compatible Donor${total === 1 ? '' : 's'} Found`;

                // Render Map
                const userLoc = (lat && lng) ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null;
                renderLeafletMap(donors, userLoc, radius ? parseFloat(radius) : 50);

                if (total === 0) {
                    donorResultsGrid.innerHTML = `
                        <div style="grid-column: 1 / -1; text-align: center; padding: 36px 20px; background: #FFFFFF; border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
                            <i class="fa-solid fa-user-slash" style="font-size: 32px; color: var(--text-light); margin-bottom: 12px; display: block;"></i>
                            <h3 style="font-size: 16px; color: var(--secondary); margin-bottom: 6px;">No Active Donors Found</h3>
                            <p style="font-size: 14px; color: var(--text-secondary); max-width: 500px; margin: 0 auto;">
                                We checked donors matching <strong>${result.data.compatibleGroups.join(', ')}</strong>, but none are currently Available.
                            </p>
                        </div>
                    `;
                    return;
                }

                // Render Donor Grid Cards
                donorResultsGrid.innerHTML = donors.map(donor => {
                    const matchTagClass = donor.isExactMatch ? 'match-tag-exact' : 'match-tag-compat';
                    const componentDisplay = donor.componentType === 'all' 
                        ? 'Whole Blood & Platelets' 
                        : donor.componentType === 'platelets' 
                            ? 'Platelets (SDP)' 
                            : 'Whole Blood';

                    const distanceBadgeHtml = (donor.distance_km !== null && donor.distance_km !== undefined)
                        ? `<div class="distance-badge"><i class="fa-solid fa-route"></i> ${donor.distance_km} km away</div>`
                        : `<div class="distance-badge" style="background:#F3F4F6; color:var(--text-secondary);"><i class="fa-solid fa-location-dot"></i> City Match</div>`;

                    return `
                        <div class="donor-card" data-donor-id="${donor.id}" style="cursor: pointer;" title="Click card to locate on map">
                            <div>
                                <div class="donor-card-top">
                                    <div>
                                        <h4 style="font-size: 16px; font-weight: 700; color: var(--secondary); display: flex; align-items: center; gap: 8px;">
                                            <i class="fa-solid fa-circle-user"></i> ${donor.name}
                                        </h4>
                                        <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-top: 4px;">
                                            <span class="match-tag ${matchTagClass}">
                                                ${donor.matchType}
                                            </span>
                                            ${distanceBadgeHtml}
                                        </div>
                                    </div>
                                    <div class="donor-blood-badge">
                                        ${donor.bloodGroup}
                                    </div>
                                </div>

                                <div style="margin: 14px 0;">
                                    <div class="donor-detail-item">
                                        <i class="fa-solid fa-location-dot"></i>
                                        <span>${donor.city}${donor.pincode ? ` (${donor.pincode})` : ''}</span>
                                    </div>
                                    <div class="donor-detail-item">
                                        <i class="fa-solid fa-hand-holding-droplet"></i>
                                        <span>Can Donate: <strong>${componentDisplay}</strong></span>
                                    </div>
                                    <div class="donor-detail-item">
                                        <i class="fa-solid fa-medal"></i>
                                        <span>Successful Donations: <strong>${donor.totalDonations || 0}</strong></span>
                                    </div>
                                    <div class="donor-detail-item" style="margin-top: 8px;">
                                        <span class="masked-contact">
                                            <i class="fa-solid fa-shield-halved"></i> ${donor.maskedPhone}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div style="border-top: 1px solid var(--border-color); padding-top: 14px; margin-top: 8px;">
                                <button type="button" class="btn btn-primary btn-block btn-request-donor" data-donor-id="${donor.id}" data-donor-name="${donor.name}" style="padding: 9px 14px; font-size: 13px;">
                                    <i class="fa-solid fa-paper-plane"></i> Request Blood
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');

                // Click donor card to focus & open popup on map
                document.querySelectorAll('.donor-card').forEach(card => {
                    card.addEventListener('click', (e) => {
                        if (e.target.closest('.btn-request-donor')) return;
                        const donorId = parseInt(card.getAttribute('data-donor-id'));
                        const marker = donorMarkersMap.get(donorId);
                        if (marker && leafletMap) {
                            leafletMap.setView(marker.getLatLng(), 14, { animate: true });
                            marker.openPopup();
                        }
                    });
                });

                // Attach click handlers to "Request Blood" buttons
                document.querySelectorAll('.btn-request-donor').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const donorName = btn.getAttribute('data-donor-name');
                        if (!auth.isAuthenticated()) {
                            alert(`To send an emergency blood request to ${donorName}, please Sign In to your account.`);
                            window.location.href = 'login.html';
                        } else {
                            alert(`Emergency Request Flow (Phase 7): Ready to request blood from ${donorName}. This connects to the hospital verification workflow.`);
                        }
                    });
                });

                // Smooth scroll to results
                donorResultsSection.scrollIntoView({ behavior: 'smooth' });

            } else {
                donorResultsGrid.innerHTML = `
                    <div style="grid-column: 1 / -1; color: var(--danger); text-align: center; padding: 20px;">
                        ${result.data?.message || 'Error executing search.'}
                    </div>
                `;
            }

        } catch (error) {
            btnSearchDonors.disabled = false;
            btnSearchDonors.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Find Nearest Compatible Donors';
            donorResultsGrid.innerHTML = `
                <div style="grid-column: 1 / -1; color: var(--danger); text-align: center; padding: 20px;">
                    Network error communicating with the search API.
                </div>
            `;
        }
    });

    // Run initial compatibility visualizer if default value is set
    updateCompatibilityVisualizer();
});
