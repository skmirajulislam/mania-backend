#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const LOG_DIRS = [
    path.join(__dirname, '../logs'),
    path.join(__dirname, '../../logs'),
    '/var/log/grand-hotel'
];

const MAX_LOG_AGE_DAYS = 30;
const MAX_LOG_SIZE_MB = 100;

const cleanupLogs = () => {
    console.log('🧹 Starting log cleanup...');

    let totalCleaned = 0;
    let totalSize = 0;

    LOG_DIRS.forEach(logDir => {
        if (!fs.existsSync(logDir)) {
            console.log(`📁 Log directory not found: ${logDir}`);
            return;
        }

        console.log(`📁 Cleaning directory: ${logDir}`);

        const files = fs.readdirSync(logDir);
        const now = Date.now();
        const maxAge = MAX_LOG_AGE_DAYS * 24 * 60 * 60 * 1000;
        const maxSize = MAX_LOG_SIZE_MB * 1024 * 1024;

        files.forEach(file => {
            const filePath = path.join(logDir, file);

            try {
                const stats = fs.statSync(filePath);

                // Skip directories
                if (stats.isDirectory()) return;

                // Check if file should be cleaned up
                const age = now - stats.mtime.getTime();
                const size = stats.size;

                let shouldClean = false;
                let reason = '';

                if (age > maxAge) {
                    shouldClean = true;
                    reason = `older than ${MAX_LOG_AGE_DAYS} days`;
                } else if (size > maxSize) {
                    shouldClean = true;
                    reason = `larger than ${MAX_LOG_SIZE_MB}MB`;
                }

                if (shouldClean) {
                    fs.unlinkSync(filePath);
                    totalCleaned++;
                    totalSize += size;
                    console.log(`🗑️  Removed ${file} (${reason})`);
                }

            } catch (error) {
                console.warn(`⚠️  Could not process ${file}: ${error.message}`);
            }
        });
    });

    console.log(`\n✅ Cleanup completed:`);
    console.log(`   Files removed: ${totalCleaned}`);
    console.log(`   Space freed: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

    return { filesRemoved: totalCleaned, bytesFreed: totalSize };
};

const rotateLogs = () => {
    console.log('🔄 Starting log rotation...');

    LOG_DIRS.forEach(logDir => {
        if (!fs.existsSync(logDir)) return;

        const files = fs.readdirSync(logDir);

        files.forEach(file => {
            if (!file.endsWith('.log')) return;

            const filePath = path.join(logDir, file);

            try {
                const stats = fs.statSync(filePath);
                const maxSize = MAX_LOG_SIZE_MB * 1024 * 1024;

                if (stats.size > maxSize) {
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const rotatedPath = path.join(logDir, `${file}.${timestamp}.old`);

                    fs.renameSync(filePath, rotatedPath);
                    fs.writeFileSync(filePath, ''); // Create new empty log file

                    console.log(`🔄 Rotated ${file} to ${path.basename(rotatedPath)}`);
                }

            } catch (error) {
                console.warn(`⚠️  Could not rotate ${file}: ${error.message}`);
            }
        });
    });

    console.log('✅ Log rotation completed');
};

const showLogStats = () => {
    console.log('📊 Log Statistics:\n');

    LOG_DIRS.forEach(logDir => {
        if (!fs.existsSync(logDir)) {
            console.log(`📁 ${logDir}: Not found`);
            return;
        }

        const files = fs.readdirSync(logDir);
        let totalSize = 0;
        let fileCount = 0;

        files.forEach(file => {
            const filePath = path.join(logDir, file);
            try {
                const stats = fs.statSync(filePath);
                if (stats.isFile()) {
                    totalSize += stats.size;
                    fileCount++;
                }
            } catch (error) {
                // Skip files we can't read
            }
        });

        console.log(`📁 ${logDir}:`);
        console.log(`   Files: ${fileCount}`);
        console.log(`   Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
        console.log('');
    });
};

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--stats') || args.includes('-s')) {
        showLogStats();
    } else if (args.includes('--rotate') || args.includes('-r')) {
        rotateLogs();
    } else if (args.includes('--help') || args.includes('-h')) {
        console.log('Usage:');
        console.log('  node cleanup-logs.js           # Clean up old logs');
        console.log('  node cleanup-logs.js --rotate  # Rotate large logs');
        console.log('  node cleanup-logs.js --stats   # Show log statistics');
        console.log('  node cleanup-logs.js --help    # Show this help');
    } else {
        cleanupLogs();
    }
}

module.exports = { cleanupLogs, rotateLogs, showLogStats };
