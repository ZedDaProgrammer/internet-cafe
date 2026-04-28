document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    // Inside dashboard.js
    if (user.role === 'admin') {
    const adminLink = document.createElement('a');
    adminLink.href = 'admin.html';
    adminLink.textContent = 'Admin Panel';
    adminLink.style.color = '#ef4444'; // Red to make it stand out
    adminLink.style.marginRight = '15px';
    document.querySelector('.user-info').prepend(adminLink);
}
    if (!token) { window.location.href = 'index.html'; return; }
    document.getElementById('usernameDisplay').textContent = `Welcome, ${user.username}`;

    loadDashboard();

    // End Session Button Event
    document.getElementById('endSessionBtn').onclick = endBooking;

    // Logout
    document.getElementById('logoutBtn').onclick = () => {
        localStorage.clear();
        window.location.href = 'index.html';
    };
});

async function loadDashboard() {
    const token = localStorage.getItem('token');
    const pcGrid = document.getElementById('pcGrid');
    
    try {
        const response = await fetch('http://localhost:5000/api/computers', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const computers = await response.json();
        renderComputers(computers);
        checkActiveSession();
    } catch (err) {
        pcGrid.innerHTML = '<p>Error connecting to server.</p>';
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
            pcCard.onclick = () => startBooking(pc.id, pc.computer_name);
        }
        pcGrid.appendChild(pcCard);
    });
}

// START BOOKING LOGIC
async function startBooking(pcId, pcName) {
    const token = localStorage.getItem('token');
    
    if (!confirm(`Do you want to start a session on ${pcName}?`)) return;

    try {
        const response = await fetch('http://localhost:5000/api/bookings/start', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ computer_id: pcId })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('activeReservationId', data.booking.id);
            localStorage.setItem('activePcName', pcName);
            alert('Session Started!');
            loadDashboard(); // Refresh to show PC is now occupied
        } else {
            alert(data.error);
        }
    } catch (err) {
        alert('Failed to start session.');
    }
}

// END BOOKING LOGIC
async function endBooking() {
    const token = localStorage.getItem('token');
    const reservationId = localStorage.getItem('activeReservationId');

    try {
        const response = await fetch('http://localhost:5000/api/bookings/end', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ reservation_id: reservationId })
        });

        const data = await response.json();

        if (response.ok) {
            alert(`Session Ended!\nTotal Time: ${data.total_time}\nTotal Cost: ${data.total_price}`);
            localStorage.removeItem('activeReservationId');
            localStorage.removeItem('activePcName');
            loadDashboard();
        }
    } catch (err) {
        alert('Failed to end session.');
    }
}

function checkActiveSession() {
    const resId = localStorage.getItem('activeReservationId');
    const pcName = localStorage.getItem('activePcName');
    const banner = document.getElementById('activeSession');

    if (resId) {
        banner.style.display = 'flex';
        document.getElementById('activePcName').textContent = pcName;
    } else {
        banner.style.display = 'none';
    }
}