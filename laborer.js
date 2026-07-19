import { api } from './api.js';
import { translations, getLang } from './i18n.js';
import { renderDirectoryTable } from './dashboard.js';

export function setupLaborer(appState, callbacks) {
    const menuMyListing = document.getElementById('menuMyListing');
    const menuAddMachine = document.getElementById('menuAddMachine');
    const menuDirectoryLabor = document.getElementById('menuDirectoryLabor');
    const saveMachineryBtn = document.getElementById('saveMachineryBtn');
    const machineTitle = document.getElementById('machineTitle');
    const machinePrice = document.getElementById('machinePrice');
    const machineUnit = document.getElementById('machineUnit');
    const machineTypeSelect = document.getElementById('machineTypeSelect');

    menuAddMachine.addEventListener('click', () => {
        document.getElementById('laborMachineryForm').style.display = 'block';
        document.getElementById('laborListingStatus').style.display = 'none';
        if (document.getElementById('laborDirectoryPanel')) document.getElementById('laborDirectoryPanel').style.display = 'none';
        menuAddMachine.classList.add('active');
        menuMyListing.classList.remove('active');
        if (menuDirectoryLabor) menuDirectoryLabor.classList.remove('active');
    });

    menuMyListing.addEventListener('click', () => {
        document.getElementById('laborMachineryForm').style.display = 'none';
        document.getElementById('laborListingStatus').style.display = 'block';
        if (document.getElementById('laborDirectoryPanel')) document.getElementById('laborDirectoryPanel').style.display = 'none';
        menuMyListing.classList.add('active');
        menuAddMachine.classList.remove('active');
        if (menuDirectoryLabor) menuDirectoryLabor.classList.remove('active');
        renderLaborListingStatus(appState);
    });

    if (menuDirectoryLabor) {
        menuDirectoryLabor.addEventListener('click', () => {
            document.getElementById('laborMachineryForm').style.display = 'none';
            document.getElementById('laborListingStatus').style.display = 'none';
            if (document.getElementById('laborDirectoryPanel')) document.getElementById('laborDirectoryPanel').style.display = 'block';
            menuDirectoryLabor.classList.add('active');
            menuMyListing.classList.remove('active');
            menuAddMachine.classList.remove('active');
            
            // Reset active classes for filter buttons
            const btnAll = document.getElementById('btnDirFilterAllLabor');
            const btnFarmer = document.getElementById('btnDirFilterFarmerLabor');
            const btnLaborer = document.getElementById('btnDirFilterLaborerLabor');
            if (btnAll) btnAll.classList.add('active');
            if (btnFarmer) btnFarmer.classList.remove('active');
            if (btnLaborer) btnLaborer.classList.remove('active');

            renderDirectoryTable('laborDirectoryTableBody', appState, callbacks, 'all');
        });
    }

    saveMachineryBtn.addEventListener('click', async () => {
        const title = machineTitle.value.trim();
        const price = parseFloat(machinePrice.value);
        const unit = machineUnit.value;
        const type = machineTypeSelect.value;

        if (!title || isNaN(price)) {
            callbacks.showAlert("Please complete all listing details.", "error");
            return;
        }

        try {
            const newListing = {
                owner_id: appState.currentUser.phone,
                owner_name: appState.currentUser.name,
                type: 'machinery',
                title: title,
                description: 'Registered rental tractor/equipment. Ready for hyperlocal booking.',
                price_amount: price,
                price_unit: unit,
                machinery_type: type,
                latitude: appState.clientLocation[1],
                longitude: appState.clientLocation[0]
            };

            const data = await api.createListing(newListing);
            if (data.success) {
                callbacks.showAlert("Machinery listed successfully!");
                machineTitle.value = '';
                machinePrice.value = '';
                menuMyListing.click();
            } else {
                callbacks.showAlert(data.message || "Failed to publish listing.", "error");
            }
        } catch (err) {
            console.error(err);
            callbacks.showAlert("Listing publishing connection error.", "error");
        }
    });
}

export async function renderLaborListingStatus(appState) {
    const container = document.getElementById('laborListingStatus');
    container.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>';

    try {
        const response = await api.getListings('', '', appState.clientLocation[0], appState.clientLocation[1]);
        if (!response.success) {
            container.innerHTML = `<h2>My Service Listings</h2><p style="color:var(--text-muted);">Error loading listings: ${response.message}</p>`;
            return;
        }

        const userListings = response.listings.filter(l => l.owner_id === appState.currentUser.phone);
        
        if (userListings.length === 0) {
            container.innerHTML = `
                <h2>${translations[getLang()].myServiceListing}</h2>
                <p style="color: var(--text-muted); margin-top: 12px;">You do not have any active marketplace service listings yet.</p>
            `;
            return;
        }

        let listingsHtml = `<h2>${translations[getLang()].myServiceListing}</h2>`;
        userListings.forEach(item => {
            listingsHtml += `
                <div class="glass-panel" style="padding: 16px; margin-top: 16px; border-left: 4px solid ${item.type === 'machinery' ? 'var(--secondary)' : 'var(--primary)'}">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h3 style="font-size: 1.1rem;">${item.title}</h3>
                        <span class="status-badge ${item.availability_status === 'booked' ? 'status-booked' : 'status-available'}">
                            ${item.type === 'machinery' ? (item.availability_status === 'booked' ? translations[getLang()].status_booked : translations[getLang()].status_available) : translations[getLang()].status_available}
                        </span>
                    </div>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin: 8px 0;">${item.description}</p>
                    <div style="display:flex; justify-content:space-between; align-items:center; border-top: 1px solid var(--border); padding-top: 10px; margin-top: 10px;">
                        <span style="font-weight:700;">₹${item.price_amount} <span>/ ${translations[getLang()]['unit_' + item.price_unit] || item.price_unit}</span></span>
                        <span style="font-size: 0.8rem; color: var(--text-warning);"><i class="fa-solid fa-star"></i> ${item.rating} (${item.reviews_count} reviews)</span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = listingsHtml;
    } catch (err) {
        console.error(err);
        container.innerHTML = '<h2>My Service Listings</h2><p style="color:var(--text-muted);">Failed to load listing statuses.</p>';
    }
}
export default setupLaborer;
