#!/usr/bin/env node

const axios = require('axios');
const mongoose = require('mongoose');

require('dotenv').config();

const HEALTH_CHECKS = {
    database: async () => {
        try {
            await mongoose.connect(process.env.MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000
            });

            const adminDb = mongoose.connection.db.admin();
            const result = await adminDb.ping();
            await mongoose.connection.close();

            return { status: 'healthy', response_time: Date.now() };
        } catch (error) {
            return { status: 'unhealthy', error: error.message };
        }
    },

    api: async () => {
        try {
            const startTime = Date.now();
            const response = await axios.get(`${process.env.API_URL || 'http://localhost:5000'}/api/health`, {
                timeout: 5000
            });

            const responseTime = Date.now() - startTime;

            return {
                status: response.status === 200 ? 'healthy' : 'unhealthy',
                response_time: responseTime,
                status_code: response.status
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                code: error.code
            };
        }
    },

    memory: () => {
        const memUsage = process.memoryUsage();
        const totalMem = require('os').totalmem();
        const freeMem = require('os').freemem();

        return {
            status: 'healthy',
            node_memory: {
                rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
                heap_used: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
                heap_total: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB'
            },
            system_memory: {
                total: Math.round(totalMem / 1024 / 1024 / 1024) + ' GB',
                free: Math.round(freeMem / 1024 / 1024 / 1024) + ' GB',
                used_percentage: Math.round(((totalMem - freeMem) / totalMem) * 100) + '%'
            }
        };
    },

    disk: () => {
        const fs = require('fs');
        try {
            const stats = fs.statSync('.');
            return {
                status: 'healthy',
                accessible: true
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }
};

const runHealthCheck = async () => {
    console.log('🏥 Running health checks...\n');

    const results = {
        timestamp: new Date().toISOString(),
        checks: {},
        overall_status: 'healthy'
    };

    let hasUnhealthy = false;

    for (const [name, check] of Object.entries(HEALTH_CHECKS)) {
        try {
            console.log(`🔍 Checking ${name}...`);
            const result = await check();
            results.checks[name] = result;

            if (result.status === 'unhealthy') {
                hasUnhealthy = true;
                console.log(`❌ ${name}: ${result.status}`);
                if (result.error) {
                    console.log(`   Error: ${result.error}`);
                }
            } else {
                console.log(`✅ ${name}: ${result.status}`);
                if (result.response_time) {
                    console.log(`   Response time: ${result.response_time}ms`);
                }
            }
        } catch (error) {
            hasUnhealthy = true;
            results.checks[name] = {
                status: 'unhealthy',
                error: error.message
            };
            console.log(`❌ ${name}: failed with error: ${error.message}`);
        }
        console.log('');
    }

    results.overall_status = hasUnhealthy ? 'unhealthy' : 'healthy';

    console.log('📊 Health Check Summary:');
    console.log(`Overall Status: ${results.overall_status === 'healthy' ? '✅' : '❌'} ${results.overall_status.toUpperCase()}`);
    console.log(`Timestamp: ${results.timestamp}`);

    // Exit with appropriate code
    process.exit(hasUnhealthy ? 1 : 0);
};

const runQuickCheck = async () => {
    try {
        const response = await axios.get(`${process.env.API_URL || 'http://localhost:5000'}/api/health`, {
            timeout: 3000
        });

        if (response.status === 200) {
            console.log('✅ API is healthy');
            process.exit(0);
        } else {
            console.log('❌ API returned non-200 status:', response.status);
            process.exit(1);
        }
    } catch (error) {
        console.log('❌ API health check failed:', error.message);
        process.exit(1);
    }
};

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--quick') || args.includes('-q')) {
        runQuickCheck();
    } else {
        runHealthCheck();
    }
}

module.exports = { runHealthCheck, runQuickCheck, HEALTH_CHECKS };
