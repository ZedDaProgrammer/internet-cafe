let countdownInterval;
let selectedPcId = null;
let selectedPcName = "";

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('usernameDisplay').textContent = `Welcome, ${user.username}`;

    // Load computers and Check for Banner
    loadDashboard();
    checkActiveSession();

    // Attach button events
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
    } catch (err) {
        console.error("Dashboard Load Error:", err);
    }
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
            <p><strong>₱${pc.hourly_rate}/hr</strong></p>
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

function closeModal() {
    document.getElementById('durationModal').style.display = 'none';
}

async function confirmStartBooking() {
    const token = localStorage.getItem('token');
    const hours = document.getElementById('durationInput').value;

    try {
        const response = await fetch('http://localhost:5000/api/bookings/start', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ 
                computer_id: selectedPcId, 
                duration_hours: hours 
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log("Session Saved to DB:", data.booking);
            // SAVE TO LOCAL STORAGE
            localStorage.setItem('activeReservationId', data.booking.id);
            localStorage.setItem('activePcName', selectedPcName);
            localStorage.setItem('endTime', data.booking.end_time);
            
            closeModal();
            location.reload(); // Refresh to trigger the banner and timer
        } else {
            alert(data.error);
        }
    } catch (err) {
        alert("Server connection failed");
    }
}

function checkActiveSession() {
    const resId = localStorage.getItem('activeReservationId');
    const pcName = localStorage.getItem('activePcName');
    const endTime = localStorage.getItem('endTime');
    const banner = document.getElementById('activeSession');

    console.log("Checking session. ID:", resId, "EndTime:", endTime);

    if (resId && endTime && endTime !== "null") {
        banner.style.display = 'flex';
        document.getElementById('activePcNameDisplay').textContent = pcName;
        startTimer(endTime);
    } else {
        banner.style.display = 'none';
        clearInterval(countdownInterval);
    }
}

function startTimer(endTimeStr) {
    const timerDisplay = document.getElementById('timerDisplay');
    clearInterval(countdownInterval);

    const target = new Date(endTimeStr).getTime();

    countdownInterval = setInterval(() => {
        const now = new Date().getTime();
        const distance = target - now;

        if (distance < 0) {
            clearInterval(countdownInterval);
            timerDisplay.textContent = "TIME EXPIRED";
            timerDisplay.style.color = "#ef4444";
            return;
        }

        const h = Math.floor(distance / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);

        timerDisplay.textContent = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    }, 1000);
}

async function endBooking() {
    const token = localStorage.getItem('token');
    const resId = localStorage.getItem('activeReservationId');

    if (!confirm("End session now?")) return;

    const res = await fetch('http://localhost:5000/api/bookings/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reservation_id: resId })
    });

    if (res.ok) {
        localStorage.removeItem('activeReservationId');
        localStorage.removeItem('activePcName');
        localStorage.removeItem('endTime');
        location.reload();
    }
}