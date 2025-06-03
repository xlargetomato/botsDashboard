const axios = require('axios');

async function createOrder() {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer APP_ID_1123453311'
    };

    const body = {
        amount: 100,
        currency: 'SAR',
        description: 'Test Order'
    };

    try {
        const response = await axios.post('https://restpilot.paylink.sa/orders', body, { headers });
        console.log('Response:', response.data);
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

createOrder();
