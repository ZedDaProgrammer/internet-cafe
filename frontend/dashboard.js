let countdownInterval;
let selectedPcId = null;
let selectedPcName = "";

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = 'index.html'; return; }

    const user = JSON.parse(localStorage.getItem('user'));
    document.getElementById('usernameDisplay').textContent = `Welcome, ${user.username}`;

    loadDashboard();
    checkActiveSession(); // This checks if a timer should be running

    document.getElementById('endSessionBtn').onclick = endBooking;
    document.getElementById('closeModalBtn').onclick = closeModal;
    document.getElementById('confirmBookingBtn').onclick = confirmStartBooking;
});

async function loadDashboard() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('http://localhost:5000/api/computers', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const computers = await response.json();
        renderComputers(computers);
    } catch (err) { console.error("Load Error:", err); }
}

function renderComputers(pcs) {
    const pcGrid = document.getElementById('pcGrid');
    pcGrid.innerHTML = '';
    pcs.forEach(pc => {
        const pcCard = document.createElement('div');
        pcCard.className = `pc-card ${pc.status}`;
        pcCard.innerHTML = `
            <h3>${pc.computer_name}</h3>
            <p>${pc.specs}</p>
            <p class="price">₱${pc.hourly_rate}/hr</p>
            <span class="status-badge">${pc.status.toUpperCase()}</span>
        `;
        if (pc.status === 'available') {
            pcCard.onclick = () => {
                selectedPcId = pc.id;
                selectedPcName = pc.computer_name;
                document.getElementById('durationModal').style.display = 'flex';
            };
        }
        pcGrid.appendChild(pcCard);
    });
}

async function confirmStartBooking() {
    const token = localStorage.getItem('token');
    const hours = document.getElementById('durationInput').value;
    try {
        const response = await fetch('http://localhost:5000/api/bookings/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ computer_id: selectedPcId, duration_hours: hours })
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('activeReservationId', data.booking.id);
            localStorage.setItem('activePcName', selectedPcName);
            localStorage.setItem('endTime', data.booking.end_time); // CRUCIAL
            location.reload(); 
        } else { alert(data.error); }
    } catch (err) { alert("Server error"); }
}

function checkActiveSession() {
    const resId = localStorage.getItem('activeReservationId');
    const endTime = localStorage.getItem('endTime');
    const banner = document.getElementById('activeSession');

    if (resId && endTime && endTime !== "null") {
        banner.style.display = 'flex';
        document.getElementById('activePcNameDisplay').textContent = localStorage.getItem('activePcName');
        startTimer(endTime);
    }
}

function startTimer(endTimeStr) {
    const timerDisplay = document.getElementById('timerDisplay');
    clearInterval(countdownInterval);
    const target = new Date(endTimeStr).getTime();

    countdownInterval = setInterval(() => {
        const distance = target - new Date().getTime();
        if (distance < 0) {
            clearInterval(countdownInterval);
            timerDisplay.textContent = "EXPIRED";
            return;
        }
        const h = Math.floor(distance / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);
        timerDisplay.textContent = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    }, 1000);
}

function closeModal() { document.getElementById('durationModal').style.display = 'none'; }

async function endBooking() {
    const token = localStorage.getItem('token');
    const resId = localStorage.getItem('activeReservationId');
    const res = await fetch('http://localhost:5000/api/bookings/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reservation_id: resId })
    });
    if (res.ok) {
        localStorage.removeItem('activeReservationId');
        localStorage.removeItem('endTime');
        location.reload();
    }
}