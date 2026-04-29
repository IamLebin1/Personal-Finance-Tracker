const http = require('http');

// Test the login endpoint
const options = {
  hostname: '192.168.0.6',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

const data = JSON.stringify({
  username: 'lebin',
  password: '123456',
});

console.log('🧪 Testing login endpoint...');
console.log(`   URL: http://192.168.0.6:5000/api/auth/login`);
console.log(`   Username: lebin`);
console.log(`   Password: 123456`);
console.log('');

const req = http.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log(`✓ Response Status: ${res.statusCode}`);
    console.log(`✓ Response Headers:`, res.headers);
    
    try {
      const json = JSON.parse(responseData);
      console.log('');
      console.log('Response Body:');
      console.log(JSON.stringify(json, null, 2));
      
      if (res.statusCode === 200 && json.token) {
        console.log('\n✅ LOGIN SUCCESSFUL! Token received.');
        console.log(`Token: ${json.token.substring(0, 20)}...`);
      } else {
        console.log('\n❌ Login failed');
      }
    } catch (e) {
      console.log('Response:', responseData);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Connection Error: ${e.message}`);
  console.log('\nMake sure:');
  console.log('1. Backend is running: node db/service.js');
  console.log('2. Phone/PC are on same WiFi');
  console.log('3. Firewall allows port 5000');
});

req.write(data);
req.end();
