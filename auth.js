import { api } from './api.js';
import { translations, getLang } from './i18n.js';

export function setupAuth(appState, callbacks) {
    const roleFarmerOpt = document.getElementById('roleFarmerOpt');
    const roleLaborerOpt = document.getElementById('roleLaborerOpt');
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const authPhone = document.getElementById('authPhone');
    const authName = document.getElementById('authName');
    const otpModal = document.getElementById('otpModal');
    const simulatedSmsBox = document.getElementById('simulatedSmsBox');
    const otpInputs = document.querySelectorAll('.otp-field');
    const cancelOtpBtn = document.getElementById('cancelOtpBtn');
    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    const onboardName = document.getElementById('onboardName');
    const onboardPrice = document.getElementById('onboardPrice');
    const onboardUnit = document.getElementById('onboardUnit');

    const loginModal = document.getElementById('loginModal');
    const loginTriggerBtn = document.getElementById('loginTriggerBtn');
    const landingHeroLoginBtn = document.getElementById('landingHeroLoginBtn');
    const closeLoginModalBtn = document.getElementById('closeLoginModalBtn');

    // Trigger Login Modal open
    if (loginTriggerBtn) {
        loginTriggerBtn.addEventListener('click', () => {
            loginModal.style.display = 'flex';
        });
    }
    if (landingHeroLoginBtn) {
        landingHeroLoginBtn.addEventListener('click', () => {
            loginModal.style.display = 'flex';
        });
    }
    // Trigger Login Modal close
    if (closeLoginModalBtn) {
        closeLoginModalBtn.addEventListener('click', () => {
            loginModal.style.display = 'none';
        });
    }
    if (loginModal) {
        loginModal.addEventListener('click', (e) => {
            if (e.target === loginModal) {
                loginModal.style.display = 'none';
            }
        });
    }

    // Role switcher selections
    roleFarmerOpt.addEventListener('click', () => {
        roleFarmerOpt.classList.add('active');
        roleLaborerOpt.classList.remove('active');
        document.querySelector('input[name="authRole"][value="farmer"]').checked = true;
    });

    roleLaborerOpt.addEventListener('click', () => {
        roleLaborerOpt.classList.add('active');
        roleFarmerOpt.classList.remove('active');
        document.querySelector('input[name="authRole"][value="laborer"]').checked = true;
    });

    // Direct Login Handler
    sendOtpBtn.addEventListener('click', async () => {
        const name = authName.value.trim();
        const phone = authPhone.value.trim();

        if (!name) {
            callbacks.showAlert("Please enter your Full Name.", "error");
            return;
        }
        if (phone.length !== 10 || isNaN(phone)) {
            callbacks.showAlert("Please enter a valid 10-digit mobile number.", "error");
            return;
        }

        const role = document.querySelector('input[name="authRole"]:checked').value;

        try {
            const data = await api.loginDirect(phone, role, name);
            if (!data.success) {
                callbacks.showAlert(data.message || "Login failed.", "error");
                return;
            }

            // Close login modal upon success
            if (loginModal) loginModal.style.display = 'none';

            appState.currentUser = data.user;
            callbacks.showAlert("Logged in successfully!", "success");

            if (data.isNewUser && data.user.role === 'laborer') {
                // Auto-fill laborer name and show skills onboarding
                onboardName.value = name;
                document.getElementById('authView').style.display = 'none';
                document.getElementById('onboardingView').style.display = 'flex';
            } else {
                if (data.user.role === 'farmer') {
                    callbacks.enterFarmerDashboard();
                } else {
                    callbacks.enterLaborerDashboard();
                }
            }
        } catch (err) {
            console.error(err);
            callbacks.showAlert("Connection error, cannot connect to backend server.", "error");
        }
    });

    // Onboarding save profile for laborer
    saveProfileBtn.addEventListener('click', async () => {
        const name = onboardName.value.trim();
        const price = parseFloat(onboardPrice.value);
        const unit = onboardUnit.value;
        const phone = authPhone.value.trim();

        if (!name) {
            callbacks.showAlert("Please enter your full name.", "error");
            return;
        }

        const checkedSkills = Array.from(document.querySelectorAll('input[name="onboardSkills"]:checked')).map(i => i.value);

        try {
            // Step 1: Register User as Laborer in database
            const regResult = await api.registerUser({
                phone: phone,
                name: name,
                role: 'laborer',
                preferred_language: getLang(),
                skills: checkedSkills
            });

            if (!regResult.success) {
                callbacks.showAlert("Failed to register laborer profile.", "error");
                return;
            }

            appState.currentUser = regResult.user;

            // Step 2: Create a service Listing for this laborer in database
            const listingTitle = `${name} (${checkedSkills.map(s => translations[getLang()]['skill_' + s] || s).join(', ')})`;
            const newListing = {
                owner_id: phone,
                owner_name: name,
                type: 'labor',
                title: listingTitle,
                description: 'Hyperlocal skilled worker providing agricultural support. Persistent mobile rating profile.',
                price_amount: price,
                price_unit: unit,
                skills: checkedSkills,
                latitude: appState.clientLocation[1],
                longitude: appState.clientLocation[0]
            };

            await api.createListing(newListing);

            document.getElementById('onboardingView').style.display = 'none';
            callbacks.enterLaborerDashboard();
        } catch (err) {
            console.error(err);
            callbacks.showAlert("Failed to save profile registration.", "error");
        }
    });
}
