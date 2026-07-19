import { translations, getLang, setLang, translateUI } from './js/i18n.js';
import { api } from './js/api.js';
import { setupAuth } from './js/auth.js';
import { setupDashboard, setFarmerViewTab, renderListings } from './js/dashboard.js';
import { setupLaborer, renderLaborListingStatus } from './js/laborer.js';
import { setupVoice, renderVoiceSuggestions, speakResponse } from './js/voice.js';

// Global Application State
const appState = {
    currentUser: null,
    activeTab: 'labor',
    listings: [],
    bookings: [],
    payments: [],
    clientLocation: [74.0124, 18.0124] // Default Hyperlocal coordinates (Longitude, Latitude)
};

// UI Alert Helper
function showAlert(message, type = 'success') {
    const popup = document.getElementById('alertPopup');
    if (!popup) return;
    popup.innerText = message;
    popup.className = `alert-popup show ${type}`;
    
    setTimeout(() => {
        popup.className = 'alert-popup';
    }, 3500);
}

// Check Geolocation for Hyperlocal query calculations
function detectLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                appState.clientLocation = [position.coords.longitude, position.coords.latitude];
                console.log(`Detected Location: Longitude=${appState.clientLocation[0]}, Latitude=${appState.clientLocation[1]}`);
                if (appState.currentUser && appState.currentUser.role === 'farmer') {
                    renderListings('', appState, { showAlert });
                }
            },
            (error) => {
                console.warn('Geolocation blocked or unavailable. Falling back to default region.', error.message);
            }
        );
    }
}

// Switch view screen layouts
function enterFarmerDashboard() {
    document.getElementById('authView').style.display = 'none';
    document.getElementById('farmerDashboardView').style.display = 'grid';
    document.getElementById('logoutBtn').style.display = 'block';
    document.getElementById('loginTriggerBtn').style.display = 'none';

    document.getElementById('userName').innerText = appState.currentUser.name;
    document.getElementById('userAvatar').innerText = appState.currentUser.name.charAt(0).toUpperCase();
    document.getElementById('userRole').innerText = translations[getLang()].farmer;

    setFarmerViewTab('labor', appState, { showAlert, renderListings, speakResponse });
}

function enterLaborerDashboard() {
    document.getElementById('authView').style.display = 'none';
    document.getElementById('laborerDashboardView').style.display = 'grid';
    document.getElementById('logoutBtn').style.display = 'block';
    document.getElementById('loginTriggerBtn').style.display = 'none';

    document.getElementById('laborName').innerText = appState.currentUser.name;
    document.getElementById('laborAvatar').innerText = appState.currentUser.name.charAt(0).toUpperCase();

    document.getElementById('menuMyListing').click();
}

function initAppState() {
    // Load local storage language if exists
    const storedLang = localStorage.getItem('agri_lang');
    if (storedLang) {
        setLang(storedLang);
        document.getElementById('langSelector').value = storedLang;
    }
    
    translateUI();
    renderVoiceSuggestions(appState, { showAlert, renderListings, speakResponse });
    detectLocation();
}

// Bind Global Init logic
document.addEventListener('DOMContentLoaded', () => {
    initAppState();

    // Call module setups
    const callbacks = {
        showAlert,
        enterFarmerDashboard,
        enterLaborerDashboard,
        renderListings(search) {
            renderListings(search, appState, callbacks);
        },
        speakResponse
    };

    setupAuth(appState, callbacks);
    setupDashboard(appState, callbacks);
    setupLaborer(appState, callbacks);
    setupVoice(appState, callbacks);

    // Language Toggle Listener
    document.getElementById('langSelector').addEventListener('change', (e) => {
        setLang(e.target.value);
        translateUI();
        renderVoiceSuggestions(appState, callbacks);
        showAlert(getLang() === 'en' ? "Language changed to English!" : getLang() === 'hi' ? "भाषा बदलकर हिंदी की गई!" : "भाषा बदलून मराठी केली!");
        
        if (appState.currentUser) {
            if (appState.currentUser.role === 'farmer') {
                renderListings('', appState, callbacks);
            } else {
                renderLaborListingStatus(appState);
            }
        }
    });

    // Logout Event Listener
    document.getElementById('logoutBtn').addEventListener('click', () => {
        appState.currentUser = null;
        document.getElementById('farmerDashboardView').style.display = 'none';
        document.getElementById('laborerDashboardView').style.display = 'none';
        document.getElementById('onboardingView').style.display = 'none';
        document.getElementById('authView').style.display = 'flex';
        document.getElementById('logoutBtn').style.display = 'none';
        document.getElementById('loginTriggerBtn').style.display = 'block';
        
        const voiceAssistantWidget = document.getElementById('voiceAssistantWidget');
        if (voiceAssistantWidget) voiceAssistantWidget.style.display = 'none';
    });
});
