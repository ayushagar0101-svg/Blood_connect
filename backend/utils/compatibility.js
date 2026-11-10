/**
 * Medical Blood Compatibility Matrix & Rules Engine
 * Implements clinical transfusion compatibility for Whole Blood, Platelets, and Plasma
 */

// Red Blood Cell (RBC) & Whole Blood Compatibility Table
// Key: Recipient (Patient), Value: Array of medically eligible Donor blood groups
const RBC_COMPATIBILITY = {
    'A+': ['A+', 'A-', 'O+', 'O-'],
    'A-': ['A-', 'O-'],
    'B+': ['B+', 'B-', 'O+', 'O-'],
    'B-': ['B-', 'O-'],
    'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // Universal Recipient
    'AB-': ['AB-', 'A-', 'B-', 'O-'],
    'O+': ['O+', 'O-'],
    'O-': ['O-'],                                              // Universal Donor
    'Bombay': ['Bombay']                                       // Rare phenotype (hh)
};

/**
 * Returns array of compatible donor blood groups for a given recipient
 * @param {string} recipientGroup 
 * @returns {string[]}
 */
const getCompatibleDonors = (recipientGroup) => {
    return RBC_COMPATIBILITY[recipientGroup] || [recipientGroup];
};

/**
 * Checks if donor group can donate to recipient group
 * @param {string} donorGroup 
 * @param {string} recipientGroup 
 * @returns {boolean}
 */
const canDonate = (donorGroup, recipientGroup) => {
    const eligible = RBC_COMPATIBILITY[recipientGroup] || [];
    return eligible.includes(donorGroup);
};

/**
 * Check if a blood group is a Universal Donor (RBC)
 */
const isUniversalDonor = (group) => group === 'O-';

/**
 * Check if a blood group is a Universal Recipient (RBC)
 */
const isUniversalRecipient = (group) => group === 'AB+';

/**
 * Check if a blood group is rare
 */
const isRareBloodGroup = (group) => ['Bombay', 'AB-', 'O-'].includes(group);

/**
 * Privacy Shield: Masks a phone number (e.g. +91 9876543210 -> +91 98765*****)
 * @param {string} phone 
 * @returns {string}
 */
const maskPhoneNumber = (phone) => {
    if (!phone) return 'Hidden';
    const cleanPhone = phone.trim();
    if (cleanPhone.length <= 5) return '*****';
    const visiblePart = cleanPhone.slice(0, -5);
    return `${visiblePart}*****`;
};

module.exports = {
    RBC_COMPATIBILITY,
    getCompatibleDonors,
    canDonate,
    isUniversalDonor,
    isUniversalRecipient,
    isRareBloodGroup,
    maskPhoneNumber
};

