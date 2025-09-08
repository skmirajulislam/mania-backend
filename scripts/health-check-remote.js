#!/usr/bin/env node

const https = require('https');
const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:5002';

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https://') ? https : http;
        lib.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(data)
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: data
                    });
                }
            });
        }).on('error', reject);
    });
}

async function healthCheck() {
    console.log('🔍 Checking server health...');
    console.log(`Target URL: ${API_URL}`);

    try {
        // Test health endpoint
        const healthResponse = await makeRequest(`${API_URL}/health`);
        console.log('\n✅ Health Check:', healthResponse.status === 200 ? 'PASS' : 'FAIL');
        console.log('Response:', JSON.stringify(healthResponse.data, null, 2));

        // Test ping endpoint
        const pingResponse = await makeRequest(`${API_URL}/ping`);
        console.log('\n✅ Ping Check:', pingResponse.status === 200 ? 'PASS' : 'FAIL');
        console.log('Response:', JSON.stringify(pingResponse.data, null, 2));

        // Test API endpoint
        const apiResponse = await makeRequest(`${API_URL}/api/testimonials`);
        console.log('\n✅ API Check:', apiResponse.status === 200 ? 'PASS' : 'FAIL');
        console.log('API Status:', apiResponse.status);

    } catch (error) {
        console.error('\n❌ Health check failed:', error.message);
        process.exit(1);
    }
}

healthCheck();
