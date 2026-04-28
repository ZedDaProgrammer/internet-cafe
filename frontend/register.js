const registerForm = document.getElementById('registerForm');

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    try {
        const response = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, role: 'customer' })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Registration Successful! You can now log in.');
            window.location.href = 'index.html';
        } else {
            alert(data.error || 'Registration failed');
        }
    } catch (err) {
        console.error('Error:', err);
        alert('Could not connect to server.');
    }
});