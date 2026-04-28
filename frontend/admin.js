document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    // Security: If not admin, kick them out!
    if (!token || user.role !== 'admin') {
        alert('Unauthorized access!');
        window.location.href = 'dashboard.html';
        return;
    }

    loadAdminData();

    // Handle Adding New PC
    document.getElementById('addPcForm').onsubmit = async (e) => {
        e.preventDefault();
        const body = {
            computer_name: document.getElementById('pcName').value,
            specs: document.getElementById('pcSpecs').value,
            hourly_rate: document.getElementById('pcRate').value
        };

        const res = await fetch('http://localhost:5000/api/computers', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            alert('PC Added!');
            location.reload();
        }
    };
});

async function loadAdminData() {
    // You could create a new 'all-history' route in the backend for this
    // For now, let's focus on getting the Add PC working!
}