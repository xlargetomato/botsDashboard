// This is a test script to verify the payments API endpoint
// You can run this with Node.js to check if the API is working correctly

async function testPaymentsAPI() {
  try {
    console.log('Testing GET /api/admin/payments endpoint...');
    
    // Mock the authentication result
    const mockAuthResult = {
      success: true,
      role: 'admin'
    };
    
    // Mock the database query result
    const mockPayments = [
      {
        id: 1,
        user_id: 1,
        email: 'user1@example.com',
        name: 'User One',
        amount: 99.99,
        currency: 'SAR',
        status: 'completed',
        payment_method: 'credit_card',
        transaction_id: 'tx_123456789',
        created_at: '2023-05-15T10:30:00Z',
        updated_at: '2023-05-15T10:30:00Z'
      },
      {
        id: 2,
        user_id: 2,
        email: 'user2@example.com',
        name: 'User Two',
        amount: 199.99,
        currency: 'SAR',
        status: 'pending',
        payment_method: 'bank_transfer',
        transaction_id: 'tx_987654321',
        created_at: '2023-05-16T14:45:00Z',
        updated_at: '2023-05-16T14:45:00Z'
      }
    ];
    
    // Mock the verifyAuth and executeQuery functions
    const verifyAuth = jest.fn().mockResolvedValue(mockAuthResult);
    const executeQuery = jest.fn().mockResolvedValue(mockPayments);
    
    // Import the GET function from the route.js file
    const { GET } = require('./route');
    
    // Create a mock request object
    const mockRequest = {};
    
    // Call the GET function with the mock request
    const response = await GET(mockRequest);
    
    // Log the response
    console.log('Response status:', response.status);
    console.log('Response body:', await response.json());
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testPaymentsAPI();
