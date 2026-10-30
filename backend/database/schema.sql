-- ========================================================
-- BloodConnect Database Schema
-- Multi-role Blood Donor & Emergency Matching Platform
-- ========================================================

CREATE DATABASE IF NOT EXISTS bloodconnect_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE bloodconnect_db;

-- 1. Users Table (Core Auth & Roles)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('donor', 'requester', 'hospital', 'admin') NOT NULL DEFAULT 'donor',
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_role (role),
    INDEX idx_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Donor Profiles Table (Medical Info, Location & Cooldown)
CREATE TABLE IF NOT EXISTS donor_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Bombay') NOT NULL,
    component_type ENUM('whole_blood', 'platelets', 'plasma', 'all') DEFAULT 'whole_blood',
    gender ENUM('male', 'female', 'other') NOT NULL,
    date_of_birth DATE NOT NULL,
    weight_kg DECIMAL(5, 2) NOT NULL,
    city VARCHAR(100) NOT NULL,
    pincode VARCHAR(20) NOT NULL,
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    availability_status ENUM('available', 'busy', 'cooldown') DEFAULT 'available',
    last_donated_at DATETIME NULL,
    cooldown_until DATETIME NULL,
    total_donations INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_blood_group (blood_group),
    INDEX idx_donor_location (latitude, longitude),
    INDEX idx_availability (availability_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Blood Requests Table (Patient Requirements & Emergency SOS)
CREATE TABLE IF NOT EXISTS blood_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requester_id INT NOT NULL,
    patient_name VARCHAR(100) NOT NULL,
    blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Bombay') NOT NULL,
    component_needed ENUM('whole_blood', 'platelets', 'plasma') DEFAULT 'whole_blood',
    units_required INT NOT NULL DEFAULT 1,
    hospital_name VARCHAR(150) NOT NULL,
    hospital_city VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    urgency_level ENUM('normal', 'urgent', 'critical_sos') DEFAULT 'normal',
    prescription_url VARCHAR(255) NULL,
    status ENUM('open', 'in_progress', 'fulfilled', 'cancelled', 'expired') DEFAULT 'open',
    required_by DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_req_blood_group (blood_group),
    INDEX idx_req_status (status),
    INDEX idx_req_urgency (urgency_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Request Responses Table (Donor Acceptance & Two-Way Privacy)
CREATE TABLE IF NOT EXISTS request_responses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    donor_id INT NOT NULL,
    response_status ENUM('accepted', 'rejected', 'en_route', 'at_hospital', 'completed', 'cancelled') DEFAULT 'accepted',
    donor_contact_revealed BOOLEAN DEFAULT FALSE,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES blood_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_request_donor (request_id, donor_id),
    INDEX idx_response_status (response_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Donation History Table (Historical Records & Certificates)
CREATE TABLE IF NOT EXISTS donation_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donor_id INT NOT NULL,
    request_id INT NULL,
    hospital_name VARCHAR(150) NOT NULL,
    blood_group VARCHAR(10) NOT NULL,
    component_donated VARCHAR(50) DEFAULT 'whole_blood',
    units_donated INT DEFAULT 1,
    certificate_id VARCHAR(50) UNIQUE NOT NULL,
    donated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (request_id) REFERENCES blood_requests(id) ON DELETE SET NULL,
    INDEX idx_cert (certificate_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Camps Table (Community Blood Donation Drives)
CREATE TABLE IF NOT EXISTS camps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organizer_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    venue VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    camp_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_camp_date (camp_date),
    INDEX idx_camp_city (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

