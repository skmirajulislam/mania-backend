#!/usr/bin/env node

const axios = require('axios');
const mongoose = require('mongoose');

require('dotenv').config();

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

// Test data
const testUser = {
    firstName: 'Integration',
    lastName: 'Test',
    email: 'integration@test.com',
    password: 'Test123!@#',
    role: 'user'
};

let authToken = '';
let testUserId = '';

const tests = {
    async healthCheck() {
        const response = await axios.get(`${API_URL}/health`);
        if (response.status !== 200) throw new Error('Health check failed');
        return { status: 'pass', data: response.data };
    },

    async databaseConnection() {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000
        });

        const adminDb = mongoose.connection.db.admin();
        await adminDb.ping();
        await mongoose.connection.close();

        return { status: 'pass', message: 'Database connection successful' };
    },

    async userRegistration() {
        const response = await axios.post(`${API_URL}/auth/register`, testUser);
        if (response.status !== 201) throw new Error('Registration failed');

        testUserId = response.data.user._id;
        return { status: 'pass', userId: testUserId };
    },

    async userLogin() {
        const response = await axios.post(`${API_URL}/auth/login`, {
            email: testUser.email,
            password: testUser.password
        });

        if (response.status !== 200) throw new Error('Login failed');
        if (!response.data.token) throw new Error('No token received');

        authToken = response.data.token;
        return { status: 'pass', token: authToken.substring(0, 20) + '...' };
    },

    async protectedRoute() {
        const response = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        if (response.status !== 200) throw new Error('Protected route failed');
        if (response.data.user.email !== testUser.email) throw new Error('Wrong user data');

        return { status: 'pass', user: response.data.user.email };
    },

    async roomsAPI() {
        const response = await axios.get(`${API_URL}/rooms`);
        if (response.status !== 200) throw new Error('Rooms API failed');
        if (!Array.isArray(response.data.rooms)) throw new Error('Invalid rooms data structure');

        return { status: 'pass', roomCount: response.data.rooms.length };
    },

    async menuAPI() {
        const response = await axios.get(`${API_URL}/menu`);
        if (response.status !== 200) throw new Error('Menu API failed');
        if (!Array.isArray(response.data.menuItems)) throw new Error('Invalid menu data structure');

        return { status: 'pass', menuItemCount: response.data.menuItems.length };
    },

    async galleryAPI() {
        const response = await axios.get(`${API_URL}/gallery`);
        if (response.status !== 200) throw new Error('Gallery API failed');
        if (!Array.isArray(response.data.galleryItems)) throw new Error('Invalid gallery data structure');

        return { status: 'pass', galleryItemCount: response.data.galleryItems.length };
    },

    async errorHandling() {
        try {
            await axios.get(`${API_URL}/nonexistent-endpoint`);
            throw new Error('Should have returned 404');
        } catch (error) {
            if (error.response && error.response.status === 404) {
                return { status: 'pass', message: '404 handling works' };
            }
            throw error;
        }
    },

    async rateLimiting() {
        // Make rapid requests to test rate limiting
        const promises = [];
        for (let i = 0; i < 20; i++) {
            promises.push(axios.get(`${API_URL}/health`).catch(err => err.response));
        }

        const responses = await Promise.all(promises);
        const rateLimited = responses.some(r => r && r.status === 429);

        if (!rateLimited) {
            console.warn('⚠️  Rate limiting might not be working properly');
        }

        return { status: 'pass', rateLimitDetected: rateLimited };
    },

    async cleanup() {
        // Clean up test user
        if (authToken && testUserId) {
            try {
                await axios.delete(`${API_URL}/auth/user/${testUserId}`, {
                    headers: { Authorization: `Bearer ${authToken}` }
                });
            } catch (error) {
                // Ignore cleanup errors
            }
        }

        return { status: 'pass', message: 'Cleanup completed' };
    }
};

const runIntegrationTests = async () => {
    console.log('🧪 Running Integration Tests for Grand Hotel API\n');
    console.log(`📍 Testing against: ${BASE_URL}\n`);

    const results = {
        passed: 0,
        failed: 0,
        total: Object.keys(tests).length,
        details: {}
    };

    for (const [testName, testFn] of Object.entries(tests)) {
        try {
            console.log(`🔍 Running ${testName}...`);
            const startTime = Date.now();
            const result = await testFn();
            const duration = Date.now() - startTime;

            console.log(`✅ ${testName}: PASSED (${duration}ms)`);
            if (result.data || result.message || result.userId || result.token) {
                console.log(`   Details: ${JSON.stringify(result, null, 2).substring(0, 100)}...`);
            }

            results.passed++;
            results.details[testName] = { status: 'PASSED', duration, ...result };
        } catch (error) {
            console.log(`❌ ${testName}: FAILED`);
            console.log(`   Error: ${error.message}`);

            results.failed++;
            results.details[testName] = {
                status: 'FAILED',
                error: error.message,
                stack: error.response?.status || 'Unknown'
            };
        }
        console.log('');
    }

    // Print summary
    console.log('📊 Integration Test Summary:');
    console.log(`   Total tests: ${results.total}`);
    console.log(`   Passed: ${results.passed} ✅`);
    console.log(`   Failed: ${results.failed} ${results.failed > 0 ? '❌' : ''}`);
    console.log(`   Success rate: ${Math.round((results.passed / results.total) * 100)}%`);

    if (results.failed === 0) {
        console.log('\n🎉 All integration tests passed! Your API is ready for production.');
    } else {
        console.log('\n⚠️  Some tests failed. Please review the errors above.');
    }

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
};

// Run tests if this file is executed directly
if (require.main === module) {
    runIntegrationTests().catch(error => {
        console.error('💥 Integration test runner failed:', error);
        process.exit(1);
    });
}

module.exports = { runIntegrationTests, tests };
