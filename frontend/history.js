document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = 'index.html'; return; }

    const historyBody = document.getElementById('historyBody');

    try {
        const response = await fetch('http://localhost:5000/api/bookings/my-history', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        historyBody.innerHTML = data.map(row => `
            <tr>
                <td>${new Date(row.start_time).toLocaleDateString()}</td>
                <td>${row.computer_name}</td>
                <td><span class="status-badge">${row.status}</span></td>
                <td>₱${row.total_price || '0.00'}</td>
            </tr>
        `).join('');

    } catch (err) {
        historyBody.innerHTML = '<tr><td colspan="4">Error loading history</td></tr>';
    }
});