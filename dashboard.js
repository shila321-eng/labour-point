import { api } from './api.js';
import { translations, getLang } from './i18n.js';

let selectedBookingDates = [];

export function setupDashboard(appState, callbacks) {
    const menuFindLabour = document.getElementById('menuFindLabour');
    const menuMachinery = document.getElementById('menuMachinery');
    const menuMyBookings = document.getElementById('menuMyBookings');
    const menuMyPayments = document.getElementById('menuMyPayments');
    const menuDirectory = document.getElementById('menuDirectory');
    const dashboardSearch = document.getElementById('dashboardSearch');

    // Menu Item click event listeners
    menuFindLabour.addEventListener('click', () => {
        setFarmerViewTab('labor', appState, callbacks);
    });

    menuMachinery.addEventListener('click', () => {
        setFarmerViewTab('machinery', appState, callbacks);
    });

    menuMyBookings.addEventListener('click', () => {
        setFarmerViewTab('bookings', appState, callbacks);
    });

    if (menuMyPayments) {
        menuMyPayments.addEventListener('click', () => {
            setFarmerViewTab('payments', appState, callbacks);
        });
    }

    if (menuDirectory) {
        menuDirectory.addEventListener('click', () => {
            setFarmerViewTab('directory', appState, callbacks);
        });
    }

    // Global sub-tab filter for directory
    let currentDirectoryFilter = 'all';
    window.filterDirectoryView = function (role, tbodyId) {
        currentDirectoryFilter = role;
        const isFarmerView = (tbodyId === 'directoryTableBody');
        const suffix = isFarmerView ? 'Farmer' : 'Labor';
        
        const btnAll = document.getElementById(`btnDirFilterAll${suffix}`);
        const btnFarmer = document.getElementById(`btnDirFilterFarmer${suffix}`);
        const btnLaborer = document.getElementById(`btnDirFilterLaborer${suffix}`);
        
        if (btnAll) btnAll.classList.remove('active');
        if (btnFarmer) btnFarmer.classList.remove('active');
        if (btnLaborer) btnLaborer.classList.remove('active');
        
        if (role === 'all' && btnAll) btnAll.classList.add('active');
        if (role === 'farmer' && btnFarmer) btnFarmer.classList.add('active');
        if (role === 'laborer' && btnLaborer) btnLaborer.classList.add('active');
        
        renderDirectoryTable(tbodyId, appState, callbacks, role);
    };

    // Global delete handler for contacts directory
    window.handleDeleteContact = async function (phone, tbodyId) {
        if (!confirm(getLang() === 'en' ? "Are you sure you want to delete this member from the directory?" : getLang() === 'hi' ? "क्या आप वाकई इस सदस्य को निर्देशिका से हटाना चाहते हैं?" : "तुम्हाला नक्की या सदस्याला निर्देशिकेतून हटवायचे आहे का?")) {
            return;
        }

        try {
            const result = await api.deleteContact(phone);
            if (result.success) {
                const popup = document.getElementById('alertPopup');
                if (popup) {
                    popup.innerText = getLang() === 'en' ? "Contact deleted successfully." : getLang() === 'hi' ? "संपर्क सफलतापूर्वक हटा दिया गया।" : "संपर्क यशस्वीरित्या हटवला.";
                    popup.className = `alert-popup show success`;
                    setTimeout(() => { popup.className = 'alert-popup'; }, 3500);
                }
                renderDirectoryTable(tbodyId, null, null);
            } else {
                alert(result.message || "Failed to delete contact.");
            }
        } catch (err) {
            console.error(err);
            alert("Connection error, failed to delete contact.");
        }
    };

    // Search input listeners
    dashboardSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        renderListings(query, appState, callbacks);
    });

    // Expose window functions for dynamic inline events
    window.viewListingDetail = function (listingId) {
        viewListingDetail(listingId, appState, callbacks);
    };

    window.closeListingDetail = function () {
        document.getElementById('listingDetailPanel').style.display = 'none';
        document.getElementById('listingsPanel').style.display = 'block';
    };

    window.selectCalendarDate = function (elem, dateStr) {
        const idx = selectedBookingDates.indexOf(dateStr);
        if (idx > -1) {
            selectedBookingDates.splice(idx, 1);
            elem.classList.remove('selected');
        } else {
            selectedBookingDates.push(dateStr);
            elem.classList.add('selected');
        }

        const btn = document.getElementById('confirmRentBtn');
        if (btn) {
            if (selectedBookingDates.length > 0) {
                btn.removeAttribute('disabled');
            } else {
                btn.setAttribute('disabled', 'true');
            }
        }
    };

    window.confirmLaborerBooking = async function (listingId) {
        const item = appState.listings.find(l => l._id === listingId || l.id === listingId);
        if (!item) return;

        const bookingData = {
            listing_id: item._id || item.id,
            listing_title: item.title,
            listing_type: item.type,
            farmer_phone: appState.currentUser.phone,
            owner_name: item.owner_name,
            price_amount: item.price_amount,
            price_unit: item.price_unit,
            dates: ['Today']
        };

        try {
            const data = await api.createBooking(bookingData);
            if (data.success) {
                callbacks.showAlert(`${translations[getLang()].bookingSuccess} Owner notified.`, "success");
                callbacks.speakResponse(translations[getLang()].bookingSuccess);
                window.closeListingDetail();
                // Refresh list if needed
                setFarmerViewTab(appState.activeTab, appState, callbacks);
            } else {
                callbacks.showAlert(data.message || "Failed to book helper", "error");
            }
        } catch (err) {
            console.error(err);
            callbacks.showAlert("Booking connection error.", "error");
        }
    };

    window.confirmMachineryRental = async function (listingId) {
        const item = appState.listings.find(l => l._id === listingId || l.id === listingId);
        if (!item) return;

        const bookingData = {
            listing_id: item._id || item.id,
            listing_title: item.title,
            listing_type: item.type,
            farmer_phone: appState.currentUser.phone,
            owner_name: item.owner_name,
            price_amount: item.price_amount,
            price_unit: item.price_unit,
            dates: [...selectedBookingDates]
        };

        try {
            const data = await api.createBooking(bookingData);
            if (data.success) {
                callbacks.showAlert(translations[getLang()].bookingSuccess, "success");
                callbacks.speakResponse(translations[getLang()].bookingSuccess);
                selectedBookingDates = [];
                window.closeListingDetail();
                setFarmerViewTab(appState.activeTab, appState, callbacks);
            } else {
                callbacks.showAlert(data.message || "Failed to rent machinery", "error");
            }
        } catch (err) {
            console.error(err);
            callbacks.showAlert("Booking connection error.", "error");
        }
    };
}

export function setFarmerViewTab(tab, appState, callbacks) {
    appState.activeTab = tab;

    // Toggle active menu indicators
    document.getElementById('menuFindLabour').classList.remove('active');
    document.getElementById('menuMachinery').classList.remove('active');
    document.getElementById('menuMyBookings').classList.remove('active');
    
    const menuMyPayments = document.getElementById('menuMyPayments');
    if (menuMyPayments) menuMyPayments.classList.remove('active');

    const menuDirectory = document.getElementById('menuDirectory');
    if (menuDirectory) menuDirectory.classList.remove('active');

    document.getElementById('listingsPanel').style.display = 'block';
    document.getElementById('listingDetailPanel').style.display = 'none';
    document.getElementById('bookingsPanel').style.display = 'none';
    
    const paymentsPanel = document.getElementById('paymentsPanel');
    if (paymentsPanel) paymentsPanel.style.display = 'none';

    const directoryPanel = document.getElementById('directoryPanel');
    if (directoryPanel) directoryPanel.style.display = 'none';

    if (tab === 'labor') {
        document.getElementById('menuFindLabour').classList.add('active');
        document.getElementById('listingsViewTitle').innerText = translations[getLang()].availableLabour;
        renderListings('', appState, callbacks);
    } else if (tab === 'machinery') {
        document.getElementById('menuMachinery').classList.add('active');
        document.getElementById('listingsViewTitle').innerText = translations[getLang()].availableMachinery;
        renderListings('', appState, callbacks);
    } else if (tab === 'bookings') {
        document.getElementById('menuMyBookings').classList.add('active');
        document.getElementById('listingsPanel').style.display = 'none';
        document.getElementById('bookingsPanel').style.display = 'block';
        renderBookings(appState);
    } else if (tab === 'payments') {
        if (menuMyPayments) menuMyPayments.classList.add('active');
        document.getElementById('listingsPanel').style.display = 'none';
        if (paymentsPanel) paymentsPanel.style.display = 'block';
        renderPayments(appState, callbacks);
    } else if (tab === 'directory') {
        if (menuDirectory) menuDirectory.classList.add('active');
        document.getElementById('listingsPanel').style.display = 'none';
        if (directoryPanel) directoryPanel.style.display = 'block';
        
        // Reset directory filter tabs to 'All'
        const btnAll = document.getElementById('btnDirFilterAllFarmer');
        const btnFarmer = document.getElementById('btnDirFilterFarmerFarmer');
        const btnLaborer = document.getElementById('btnDirFilterLaborerFarmer');
        if (btnAll) btnAll.classList.add('active');
        if (btnFarmer) btnFarmer.classList.remove('active');
        if (btnLaborer) btnLaborer.classList.remove('active');

        renderDirectoryTable('directoryTableBody', appState, callbacks, 'all');
    }
}

export async function renderDirectoryTable(tbodyId, appState, callbacks, filterRole = 'all') {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>';
    
    try {
        const data = await api.getContacts();
        if (!data.success) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-muted);">Error: ${data.message}</td></tr>`;
            return;
        }
        
        let filteredContacts = data.contacts;
        if (filterRole !== 'all') {
            filteredContacts = data.contacts.filter(c => c.role === filterRole);
        }
        
        if (filteredContacts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-muted);">${getLang() === 'en' ? 'No contacts in directory matching filter.' : getLang() === 'hi' ? 'निर्देशिका में कोई संपर्क नहीं है।' : 'निर्देशिकेत संपर्क नाहीत.'}</td></tr>`;
            return;
        }
        
        let html = '';
        filteredContacts.forEach((contact) => {
            const dateStr = contact.registeredAt ? new Date(contact.registeredAt).toLocaleString(getLang()) : '';
            const localizedRole = contact.role === 'farmer' ? translations[getLang()].farmer : translations[getLang()].laborer;
            
            let skillsHtml = '';
            if (contact.skills && contact.skills.length > 0) {
                contact.skills.forEach(s => {
                    if (s) {
                        const localizedSkill = translations[getLang()]['skill_' + s] || s;
                        skillsHtml += `<span class="skill-tag" style="font-size: 0.75rem; padding: 2px 6px; margin: 2px; display: inline-block;">${localizedSkill}</span>`;
                    }
                });
            } else {
                skillsHtml = '<span style="color: var(--text-muted); font-size: 0.85rem;">—</span>';
            }
            
            html += `
                <tr>
                    <td style="font-weight: 600; color: var(--text-primary);">${contact.name}</td>
                    <td>${contact.phone}</td>
                    <td><span class="status-badge ${contact.role === 'farmer' ? 'status-available' : 'status-booked'}" style="padding: 4px 8px; font-size: 0.8rem;">${localizedRole}</span></td>
                    <td>${skillsHtml}</td>
                    <td style="font-size: 0.85rem;">${dateStr}</td>
                    <td>
                        <button class="btn-delete-contact" onclick="handleDeleteContact('${contact.phone}', '${tbodyId}')">
                            <i class="fa-solid fa-trash-can"></i> ${getLang() === 'en' ? 'Delete' : getLang() === 'hi' ? 'हटाएं' : 'हटवा'}
                        </button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-muted);">Failed to load contacts directory.</td></tr>';
    }
}

export async function renderListings(searchQuery = '', appState, callbacks) {
    const grid = document.getElementById('listingsGrid');
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 12px;"></i><p>Loading listings...</p></div>';

    try {
        const type = appState.activeTab === 'labor' ? 'labor' : 'machinery';
        const data = await api.getListings(searchQuery, type, appState.clientLocation[0], appState.clientLocation[1]);

        if (!data.success) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);"><p>Error fetching listings: ${data.message}</p></div>`;
            return;
        }

        appState.listings = data.listings;
        grid.innerHTML = '';

        document.getElementById('listingsCount').innerText = `${translations[getLang()].currentRadius} 10 km | ${data.listings.length} results`;

        if (data.listings.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fa-solid fa-magnifying-glass" style="font-size: 2rem; margin-bottom: 12px;"></i>
                    <p>No listings found within 10km radius matching your parameters.</p>
                </div>
            `;
            return;
        }

        data.listings.forEach(item => {
            const card = document.createElement('div');
            card.className = `glass-panel listing-card type-${item.type}`;

            let ratingHtml = '';
            if (item.rating > 0) {
                ratingHtml = `
                    <div class="rating-stars">
                        <i class="fa-solid fa-star"></i>
                        <span>${item.rating.toFixed(1)}</span>
                        <span class="rating-count">(${item.reviews_count})</span>
                    </div>
                `;
            }

            let skillsHtml = '';
            if (item.skills && item.skills.length > 0) {
                skillsHtml = `<div class="listing-skills">`;
                item.skills.forEach(s => {
                    const localizedSkillName = translations[getLang()]['skill_' + s] || s;
                    skillsHtml += `<span class="skill-tag">${localizedSkillName}</span>`;
                });
                skillsHtml += `</div>`;
            }

            let statusHtml = '';
            if (item.type === 'machinery') {
                const isBooked = item.availability_status === 'booked';
                statusHtml = `
                    <span class="status-badge ${isBooked ? 'status-booked' : 'status-available'}">
                        ${isBooked ? translations[getLang()].status_booked : translations[getLang()].status_available}
                    </span>
                `;
            }

            const id = item._id || item.id;
            card.innerHTML = `
                <div>
                    <div class="listing-header">
                        <div>
                            <h3 class="listing-title">${item.title}</h3>
                            <div class="listing-meta">
                                <span><i class="fa-solid fa-user"></i> ${item.owner_name}</span>
                                <span>•</span>
                                <span><i class="fa-solid fa-location-dot"></i> ${item.distance_km ? item.distance_km.toFixed(1) : '1.5'} km</span>
                            </div>
                        </div>
                        ${statusHtml}
                    </div>
                    
                    <p class="listing-description">${item.description}</p>
                    ${skillsHtml}
                </div>

                <div class="listing-footer">
                    <div class="price-tag">
                        ₹${item.price_amount}<span>/ ${translations[getLang()]['unit_' + item.price_unit] || item.price_unit}</span>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap: 8px;">
                        ${ratingHtml}
                        <button class="btn btn-primary btn-sm" onclick="viewListingDetail('${id}')" style="padding: 6px 12px; font-size:0.8rem;">
                            ${translations[getLang()].verify}
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        console.error(err);
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);"><p>Error loading content.</p></div>';
    }
}

async function viewListingDetail(listingId, appState, callbacks) {
    const item = appState.listings.find(l => l._id === listingId || l.id === listingId);
    if (!item) return;

    document.getElementById('listingsPanel').style.display = 'none';
    const detailPanel = document.getElementById('listingDetailPanel');
    detailPanel.style.display = 'block';

    let calendarHtml = '';
    if (item.type === 'machinery') {
        calendarHtml = renderBookingCalendar(item);
    }

    let reviewsHtml = '';
    if (item.reviews && item.reviews.length > 0) {
        reviewsHtml = `<div style="margin-top: 24px;"><h3>${translations[getLang()].reviews}</h3>`;
        item.reviews.forEach(r => {
            reviewsHtml += `
                <div class="review-item">
                    <div class="review-meta">
                        <span class="review-author">${r.author}</span>
                        <div>
                            <span class="review-tag">${translations[getLang()]['skill_' + r.skill] || r.skill || 'General'}</span>
                            <span style="color: var(--text-warning); margin-left: 8px;">
                                <i class="fa-solid fa-star"></i> ${r.rating}
                            </span>
                        </div>
                    </div>
                    <p class="review-comment">"${r.comment}"</p>
                </div>
            `;
        });
        reviewsHtml += `</div>`;
    } else {
        reviewsHtml = `
            <div style="margin-top: 24px;">
                <h3>${translations[getLang()].reviews}</h3>
                <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 8px;">No reviews yet.</p>
            </div>
        `;
    }

    const id = item._id || item.id;
    detailPanel.innerHTML = `
        <div class="back-btn" onclick="closeListingDetail()">
            <i class="fa-solid fa-arrow-left"></i> ${translations[getLang()].back}
        </div>

        <div class="booking-section">
            <div>
                <h2 style="font-size: 1.8rem; margin-bottom: 8px;">${item.title}</h2>
                <div class="listing-meta" style="font-size: 0.95rem; margin-bottom: 16px;">
                    <span><i class="fa-solid fa-user"></i> ${item.owner_name}</span>
                    <span>•</span>
                    <span><i class="fa-solid fa-location-dot"></i> ${item.distance_km ? item.distance_km.toFixed(1) : '1.5'} km away</span>
                </div>
                <p style="line-height: 1.6; margin-bottom: 20px;">${item.description}</p>
                
                <div style="background: rgba(255,255,255,0.02); padding: 16px; border-radius: 12px; border: 1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <span style="color: var(--text-muted); font-size: 0.85rem;">${translations[getLang()].rateWage}</span>
                        <div style="font-size: 1.5rem; font-weight:700; color: var(--text-success);">
                            ₹${item.price_amount} <span style="font-size: 0.9rem; color: var(--text-muted);">/ ${translations[getLang()]['unit_' + item.price_unit] || item.price_unit}</span>
                        </div>
                    </div>
                    ${item.type === 'machinery' ? '' : `
                        <button class="btn btn-primary" onclick="confirmLaborerBooking('${id}')">
                            ${translations[getLang()].bookNow} <i class="fa-solid fa-phone"></i>
                        </button>
                    `}
                </div>
                
                ${reviewsHtml}
            </div>

            ${item.type === 'machinery' ? `
                <div class="glass-panel calendar-container">
                    <h3 style="margin-bottom: 12px;"><i class="fa-solid fa-calendar-days"></i> ${translations[getLang()].bookingCalendar}</h3>
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 16px;">Select available dates to confirm rental booking.</p>
                    ${calendarHtml}
                    <button class="btn btn-primary" style="width: 100%; margin-top: 16px;" onclick="confirmMachineryRental('${id}')" id="confirmRentBtn" disabled>
                        ${translations[getLang()].bookNow}
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

function renderBookingCalendar(item) {
    const booked = item.booked_dates || [];
    const daysInMonth = 31;
    let calendarCells = '';

    const daysArr = getLang() === 'en' ? ['Su','Mo','Tu','We','Th','Fr','Sa'] : getLang() === 'hi' ? ['रवि','सोम','मंगल','बुध','गुरु','शुक्र','शनि'] : ['रवि','सोम','मंगळ','बुध','गुरू','शुक्र','शनी'];
    let headerHtml = `<div class="calendar-grid">`;
    daysArr.forEach(d => {
        headerHtml += `<div class="calendar-day-label">${d}</div>`;
    });

    for(let i=0; i<3; i++) {
        calendarCells += `<div class="calendar-day empty"></div>`;
    }

    for(let day=1; day<=daysInMonth; day++) {
        const dateStr = `2026-07-${day < 10 ? '0'+day : day}`;
        const isBooked = booked.includes(dateStr);
        const cellClass = isBooked ? 'calendar-day booked' : 'calendar-day';
        const clickAttr = isBooked ? '' : `onclick="selectCalendarDate(this, '${dateStr}')"`;

        calendarCells += `<div class="${cellClass}" ${clickAttr}>${day}</div>`;
    }
    
    return headerHtml + calendarCells + `</div>`;
}

export async function renderBookings(appState) {
    const container = document.getElementById('myBookingsGrid');
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>';

    try {
        const data = await api.getBookings(appState.currentUser.phone);
        container.innerHTML = '';

        if (!data.success || data.bookings.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fa-solid fa-calendar-xmark" style="font-size: 2rem; margin-bottom: 12px;"></i>
                    <p>You have no active rental or labor bookings yet.</p>
                </div>
            `;
            return;
        }

        data.bookings.forEach(b => {
            const card = document.createElement('div');
            card.className = `glass-panel listing-card type-${b.listing_type}`;
            card.innerHTML = `
                <div>
                    <div class="listing-header">
                        <div>
                            <h3 class="listing-title">${b.listing_title}</h3>
                            <p style="font-size:0.8rem; color: var(--text-muted); margin-top: 4px;">Owner: ${b.owner_name}</p>
                        </div>
                        <span class="status-badge status-available">Confirmed</span>
                    </div>
                    <div style="margin-top: 12px;">
                        <span style="font-size:0.8rem; color: var(--text-muted); font-weight:600;">Booked Slots:</span>
                        <p style="font-size:0.9rem; font-weight:700; color:var(--text-success); margin-top: 2px;">
                            ${b.dates.join(', ')}
                        </p>
                    </div>
                </div>
                <div class="listing-footer" style="margin-top: 16px;">
                    <div class="price-tag">
                        ₹${b.price_amount}<span>/ ${translations[getLang()]['unit_' + b.price_unit] || b.price_unit}</span>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">Failed to load bookings.</div>';
    }
}

export async function renderPayments(appState, callbacks) {
    const container = document.getElementById('myPaymentsGrid');
    if (!container) return;

    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading payments...</div>';

    try {
        const data = await api.getPayments(appState.currentUser.phone);
        container.innerHTML = '';

        if (!data.success || data.payments.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fa-solid fa-file-invoice-dollar" style="font-size: 2rem; margin-bottom: 12px;"></i>
                    <p>No transactions or payments logged yet.</p>
                </div>
            `;
            return;
        }

        data.payments.forEach(p => {
            const card = document.createElement('div');
            card.className = 'glass-panel listing-card';
            card.style.borderLeft = '4px solid #10b981'; // Green accent for payment status
            
            const pDate = new Date(p.created_at).toLocaleDateString(getLang() === 'en' ? 'en-US' : 'hi-IN', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            card.innerHTML = `
                <div>
                    <div class="listing-header">
                        <div>
                            <h3 class="listing-title">${p.listing_title}</h3>
                            <p style="font-size:0.8rem; color: var(--text-muted); margin-top: 4px;">Beneficiary: ${p.owner_name}</p>
                        </div>
                        <span class="status-badge status-available" style="background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2);">
                            ${p.status.toUpperCase()}
                        </span>
                    </div>
                    
                    <div style="margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.8rem;">
                        <div>
                            <span style="color: var(--text-muted);">Method:</span>
                            <span style="font-weight: 600; color: var(--text-main); display:block; margin-top:2px;">
                                <i class="fa-solid fa-credit-card"></i> ${p.payment_method}
                            </span>
                        </div>
                        <div>
                            <span style="color: var(--text-muted);">Txn ID:</span>
                            <span style="font-family: monospace; font-weight: 600; color: var(--text-main); display:block; margin-top:2px;">
                                ${p.transaction_id}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div class="listing-footer" style="margin-top: 16px; border-top: 1px solid var(--border); padding-top: 12px; display:flex; justify-content:space-between; align-items:center;">
                    <div class="price-tag" style="color: var(--text-success); font-size: 1.4rem;">
                        ₹${p.amount}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">
                        <i class="fa-solid fa-clock"></i> ${pDate}
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">Failed to load payment history.</div>';
    }
}
