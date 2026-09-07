
const BRANCHES = [
    { id: 1, name: 'GOR Futsal A', city: 'Jakarta', address: 'Jl. Merdeka No. 12, Jakarta Pusat', fieldsCount: 4, active: true },
    { id: 2, name: 'Futsal B', city: 'Bandung', address: 'Jl. Dago No. 45, Bandung', fieldsCount: 3, active: true },
    { id: 3, name: 'Futsal C', city: 'Surabaya', address: 'Jl. Tunjungan No. 78, Surabaya', fieldsCount: 5, active: true },
    { id: 4, name: 'Futsal D', city: 'Tangerang', address: 'Jl. BSD Raya No. 23, Tangerang', fieldsCount: 3, active: true },
    { id: 5, name: 'Futsal E', city: 'Bekasi', address: 'Jl. Jatiwaringin No. 67, Bekasi', fieldsCount: 4, active: true },
    { id: 6, name: 'Futsal F', city: 'Semarang', address: 'Jl. Pandanaran No. 90, Semarang', fieldsCount: 2, active: true },
    { id: 7, name: 'Futsal G', city: 'Yogyakarta', address: 'Jl. Malioboro No. 34, Yogyakarta', fieldsCount: 3, active: true },
];

const FIELDS = {
    1: [{ id: '1a', name: 'Lapangan A', type: 'Futsal 5v5' }, { id: '1b', name: 'Lapangan B', type: 'Futsal 5v5' }, { id: '1c', name: 'Lapangan C', type: 'Mini Soccer' }, { id: '1d', name: 'Lapangan D', type: 'Futsal 4v4' }],
    2: [{ id: '2a', name: 'Lapangan A', type: 'Futsal 5v5' }, { id: '2b', name: 'Lapangan B', type: 'Futsal 5v5' }, { id: '2c', name: 'Lapangan C', type: 'Mini Soccer' }],
    3: [{ id: '3a', name: 'Lapangan A', type: 'Futsal 5v5' }, { id: '3b', name: 'Lapangan B', type: 'Futsal 4v4' }, { id: '3c', name: 'Lapangan C', type: 'Futsal 5v5' }, { id: '3d', name: 'Lapangan D', type: 'Mini Soccer' }, { id: '3e', name: 'Lapangan E', type: 'Futsal 5v5' }],
    4: [{ id: '4a', name: 'Lapangan A', type: 'Futsal 5v5' }, { id: '4b', name: 'Lapangan B', type: 'Futsal 5v5' }, { id: '4c', name: 'Lapangan C', type: 'Mini Soccer' }],
    5: [{ id: '5a', name: 'Lapangan A', type: 'Futsal 5v5' }, { id: '5b', name: 'Lapangan B', type: 'Futsal 4v4' }, { id: '5c', name: 'Lapangan C', type: 'Futsal 5v5' }, { id: '5d', name: 'Lapangan D', type: 'Mini Soccer' }],
    6: [{ id: '6a', name: 'Lapangan A', type: 'Futsal 5v5' }, { id: '6b', name: 'Lapangan B', type: 'Futsal 5v5' }],
    7: [{ id: '7a', name: 'Lapangan A', type: 'Futsal 5v5' }, { id: '7b', name: 'Lapangan B', type: 'Futsal 4v4' }, { id: '7c', name: 'Lapangan C', type: 'Futsal 5v5' }],
};

// ==================== PRICING RULES (fix "dihitung server" bug) ====================
// Harga dihitung client-side dari aturan peak/off-peak — bukan placeholder statis.

function getPriceForSlot(fieldId, dateStr, timeStr) {
    // fieldId: string like "1a", dateStr: "2026-07-08", timeStr: "10:00"
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDay(); // 0=Sun, 6=Sat
    const isWeekend = day === 0 || day === 6;
    const hour = parseInt(timeStr.split(':')[0], 10);

    const fieldNum = parseInt(fieldId.match(/\d+/)?.[0] || '0', 10);

    // Pricing rules: same as PRD — peak/off-peak
    // Weekday: off-peak 06-16 (60k), peak 16-23 (90k)
    // Weekend: off-peak 06-14 (75k), peak 14-23 (110k)
    // Plus small variation per field (different quality)
    const fieldMod = ((fieldNum * 7 + fieldId.charCodeAt(fieldId.length - 1)) % 6) * 2000;

    if (isWeekend) {
        if (hour >= 6 && hour < 14) return 75000 + fieldMod;
        if (hour >= 14 && hour < 23) return 110000 + fieldMod;
        return 0;
    } else {
        if (hour >= 6 && hour < 16) return 60000 + fieldMod;
        if (hour >= 16 && hour < 23) return 90000 + fieldMod;
        return 0;
    }
}

// ==================== STATE ====================
let state = {
    selectedBranchId: null,
    selectedFieldId: null,
    selectedDate: null,
    selectedSlots: [],     // time strings "10:00"
    activeFields: [],
    activeTimeSlots: [],
    slotStatuses: {},       // key: "10:00" -> "available" | "booked" | "blocked"
};

// ==================== BRANCH RENDER ====================
function filterBranches(q) {
    const keyword = q.toLowerCase().trim();
    const filtered = BRANCHES.filter(b =>
        b.name.toLowerCase().includes(keyword) ||
        b.city.toLowerCase().includes(keyword)
    );
    renderBranches(filtered);
}

function renderBranches(list) {
    const grid = document.getElementById('branchGrid');
    if (!list.length) {
        grid.innerHTML = '<p class="col-span-full text-center text-zinc-500 py-8">Cabang nggak ditemukan.</p>';
        return;
    }
    grid.innerHTML = list.map(b => `
        <div class="branch-card ${state.selectedBranchId === b.id ? 'active' : ''}"
             role="button" tabindex="0"
             onclick="selectBranch(${b.id})"
             onkeydown="if(event.key==='Enter'||event.key===' ') { event.preventDefault(); selectBranch(${b.id}); }"
             aria-label="Pilih cabang ${b.name}">
            <span class="badge">${b.fieldsCount} Lapangan</span>
            <h3 class="display text-2xl text-white">${b.name}</h3>
            <p class="mt-1 text-sm text-zinc-500">${b.city}</p>
            <p class="mt-1 text-xs text-zinc-600">${b.address}</p>
        </div>
    `).join('');
}

// ==================== BRANCH SELECTION ====================
function selectBranch(id) {
    state.selectedBranchId = id;
    state.selectedFieldId = null;
    state.selectedSlots = [];
    state.selectedDate = null;
    document.getElementById('bookingBar').classList.add('hidden');

    const branch = BRANCHES.find(b => b.id === id);
    document.getElementById('selectedBranchName').textContent = branch.name;

    // Update field tabs
    state.activeFields = FIELDS[id] || [];
    renderFieldTabs();

    // Show field section
    document.getElementById('fieldSection').classList.remove('hidden');
    renderBranches(BRANCHES);
    window.scrollTo({ top: document.getElementById('fieldSection').offsetTop - 40, behavior: 'smooth' });
}

function deselectBranch() {
    state.selectedBranchId = null;
    state.selectedFieldId = null;
    state.selectedSlots = [];
    state.selectedDate = null;
    document.getElementById('fieldSection').classList.add('hidden');
    document.getElementById('bookingBar').classList.add('hidden');
    renderBranches(BRANCHES);
}

function renderFieldTabs() {
    const container = document.getElementById('fieldTabs');
    container.innerHTML = state.activeFields.map(f =>
        `<button class="field-tab ${state.selectedFieldId === f.id ? 'active' : ''}"
                 onclick="selectField('${f.id}')"
                 aria-label="Pilih ${f.name}">${f.name} &mdash; ${f.type}</button>`
    ).join('');
    if (state.activeFields.length && !state.selectedFieldId) {
        selectField(state.activeFields[0].id);
    }
}

function selectField(id) {
    state.selectedFieldId = id;
    state.selectedSlots = [];
    document.getElementById('bookingBar').classList.add('hidden');
    renderFieldTabs();
    if (state.selectedDate) {
        generateSlots();
    } else {
        // Reset grid
        document.getElementById('scheduleGrid').innerHTML = '<p class="col-span-full text-center text-zinc-500 py-8">Pilih tanggal dulu.</p>';
    }
}

// ==================== DATE PICKER ====================
let flatpickrInstance = null;
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    const minDate = today.toISOString().split('T')[0];

    flatpickrInstance = flatpickr('#datePicker', {
        minDate: minDate,
        dateFormat: 'Y-m-d',
        disable: [
            function(date) {
                // Block past dates
                return date < today;
            }
        ],
        onChange: function(selectedDates, dateStr) {
            state.selectedDate = dateStr;
            state.selectedSlots = [];
            document.getElementById('bookingBar').classList.add('hidden');

            const d = new Date(dateStr + 'T00:00:00');
            const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];
            document.getElementById('selectedDateLabel').textContent = days[d.getDay()] + ', ' + d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

            if (state.selectedFieldId) {
                generateSlots();
            }
        }
    });

    renderBranches(BRANCHES);
});

// ==================== SLOT GENERATION ====================
function generateSlots() {
    if (!state.selectedFieldId || !state.selectedDate) return;

    const dateObj = new Date(state.selectedDate + 'T00:00:00');
    const day = dateObj.getDay();
    const isWeekend = day === 0 || day === 6;

    // Generate time slots 08:00 - 22:00
    const slots = [];
    for (let h = 8; h < 22; h++) {
        const time = h.toString().padStart(2, '0') + ':00';
        const price = getPriceForSlot(state.selectedFieldId, state.selectedDate, time);
        if (price > 0) {
            slots.push({ time, price });
        }
    }

    state.activeTimeSlots = slots;
    generateSlotStatuses();
    renderSlotGrid();
    updateBookingBar();
}

function generateSlotStatuses() {
    // Simulate some booked & blocked slots for demo
    const statuses = {};
    const dateNum = parseInt(state.selectedDate.replace(/-/g, ''), 10);
    const fieldNum = parseInt(state.selectedFieldId.match(/\d+/)?.[0] || '0', 10);

    state.activeTimeSlots.forEach((slot, i) => {
        // Deterministic pseudo-random based on date + field + hour
        const seed = dateNum * 13 + fieldNum * 7 + parseInt(slot.time, 10) * 3;
        const r = ((seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
        if (r < 0.15) {
            statuses[slot.time] = 'booked';
        } else if (r < 0.2) {
            statuses[slot.time] = 'blocked';
        } else {
            statuses[slot.time] = 'available';
        }
    });
    state.slotStatuses = statuses;
}

function renderSlotGrid() {
    const grid = document.getElementById('scheduleGrid');
    if (!state.activeTimeSlots.length) {
        grid.innerHTML = '';
        document.getElementById('noSlots').classList.remove('hidden');
        return;
    }
    document.getElementById('noSlots').classList.add('hidden');

    grid.innerHTML = state.activeTimeSlots.map(slot => {
        const status = state.slotStatuses[slot.time] || 'available';
        const isSelected = state.selectedSlots.includes(slot.time);
        let extraClass = '';
        let disabled = false;
        let label = '';

        if (status === 'booked') { extraClass = 'booked'; disabled = true; label = 'Dipesan'; }
        else if (status === 'blocked') { extraClass = 'blocked'; disabled = true; label = 'Libur'; }
        else if (isSelected) { extraClass = 'selected'; }

        // Harga langsung ditampilkan — FIX: nggak ada "dihitung server" placeholder
        const priceStr = 'Rp' + (slot.price / 1000).toFixed(0) + 'k';

        return `<div class="slot-cell ${extraClass} ${disabled ? 'unavailable' : ''}"
                     role="button" tabindex="${disabled ? -1 : 0}"
                     data-time="${slot.time}"
                     onclick="${disabled ? '' : `toggleSlot('${slot.time}')`}"
                     onkeydown="${disabled ? '' : `if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleSlot('${slot.time}')}`}"
                     aria-label="${slot.time} — ${priceStr} ${label ? '('+label+')' : ''}"
                     ${disabled ? 'aria-disabled="true"' : ''}>
                    <span class="time">${slot.time}</span>
                    <span class="price">${priceStr}</span>
                    ${label ? `<span class="slot-label">${label}</span>` : '<span class="slot-label">&nbsp;</span>'}
                </div>`;
    }).join('');
}

// ==================== SLOT SELECTION ====================
function toggleSlot(time) {
    if (state.slotStatuses[time] && state.slotStatuses[time] !== 'available') return;

    const idx = state.selectedSlots.indexOf(time);
    if (idx > -1) {
        state.selectedSlots.splice(idx, 1);
    } else {
        state.selectedSlots.push(time);
        state.selectedSlots.sort();
    }
    renderSlotGrid();
    updateBookingBar();
}

function updateBookingBar() {
    const bar = document.getElementById('bookingBar');
    const info = document.getElementById('barInfo');
    const totalEl = document.getElementById('barTotal');
    const bookBtn = document.getElementById('barBookBtn');

    if (!state.selectedSlots.length || !state.selectedFieldId) {
        bar.classList.add('hidden');
        return;
    }

    bar.classList.remove('hidden');

    const total = state.selectedSlots.reduce((sum, t) => {
        const slot = state.activeTimeSlots.find(s => s.time === t);
        return sum + (slot ? slot.price : 0);
    }, 0);

    const branch = BRANCHES.find(b => b.id === state.selectedBranchId);
    const field = state.activeFields.find(f => f.id === state.selectedFieldId);

    info.textContent = state.selectedSlots.length + ' jam @ ' + (branch ? branch.name : '') + ' — Lap. ' + (field ? field.name : '');
    totalEl.textContent = 'Rp ' + total.toLocaleString('id-ID');
    bookBtn.disabled = false;
}
