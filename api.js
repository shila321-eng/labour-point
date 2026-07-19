export const api = {
    async sendOtp(phoneNumber) {
        const response = await fetch('/api/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber })
        });
        return response.json();
    },

    async verifyOtp(phoneNumber, otpCode) {
        const response = await fetch('/api/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber, otpCode })
        });
        return response.json();
    },

    async loginDirect(phone, role, name) {
        const response = await fetch('/api/login-direct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, role, name })
        });
        return response.json();
    },

    async registerUser(userData) {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        return response.json();
    },

    async getUserProfile(phone) {
        const response = await fetch(`/api/user-profile?phone=${phone}`);
        return response.json();
    },

    async getListings(search = '', type = '', lng = 74.0, lat = 18.0) {
        const response = await fetch(`/api/listings?search=${encodeURIComponent(search)}&type=${type}&lng=${lng}&lat=${lat}`);
        return response.json();
    },

    async createListing(listingData) {
        const response = await fetch('/api/listings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(listingData)
        });
        return response.json();
    },

    async createBooking(bookingData) {
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        });
        return response.json();
    },

    async getBookings(phone) {
        const response = await fetch(`/api/bookings?phone=${phone}`);
        return response.json();
    },

    async getPayments(phone) {
        const response = await fetch(`/api/payments?phone=${phone}`);
        return response.json();
    },

    async getContacts() {
        const response = await fetch('/api/contacts');
        return response.json();
    },

    async deleteContact(phone) {
        const response = await fetch(`/api/contacts/${phone}`, {
            method: 'DELETE'
        });
        return response.json();
    }
};
