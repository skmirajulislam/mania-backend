const fs = require('fs');
const path = require('path');

// Simple logger service for production
class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '../logs');
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            try {
                fs.mkdirSync(this.logDir, { recursive: true });
            } catch (error) {
                console.error('Failed to create log directory:', error);
            }
        }
    }

    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level: level.toUpperCase(),
            message,
            ...meta,
            pid: process.pid,
            environment: process.env.NODE_ENV || 'development'
        };
        return JSON.stringify(logEntry);
    }

    writeLog(filename, message) {
        if (process.env.NODE_ENV === 'production') {
            try {
                const logPath = path.join(this.logDir, filename);
                fs.appendFileSync(logPath, message + '\n');
            } catch (error) {
                console.error('Failed to write log:', error);
            }
        }

        // Always log to console in development
        if (process.env.NODE_ENV !== 'production') {
            console.log(message);
        }
    }

    info(message, meta = {}) {
        const logMessage = this.formatMessage('info', message, meta);
        this.writeLog('app.log', logMessage);

        if (process.env.NODE_ENV !== 'production') {
            console.log(`ℹ️  ${message}`, meta);
        }
    }

    error(message, error = null, meta = {}) {
        const errorMeta = {
            ...meta,
            error: error ? {
                message: error.message,
                stack: error.stack,
                name: error.name
            } : null
        };

        const logMessage = this.formatMessage('error', message, errorMeta);
        this.writeLog('error.log', logMessage);

        if (process.env.NODE_ENV !== 'production') {
            console.error(`❌ ${message}`, error || '');
        }
    }

    warn(message, meta = {}) {
        const logMessage = this.formatMessage('warn', message, meta);
        this.writeLog('app.log', logMessage);

        if (process.env.NODE_ENV !== 'production') {
            console.warn(`⚠️  ${message}`, meta);
        }
    }

    debug(message, meta = {}) {
        if (process.env.NODE_ENV === 'development') {
            const logMessage = this.formatMessage('debug', message, meta);
            console.log(`🐛 ${message}`, meta);
        }
    }

    security(message, meta = {}) {
        const logMessage = this.formatMessage('security', message, meta);
        this.writeLog('security.log', logMessage);

        console.warn(`🔒 SECURITY: ${message}`, meta);
    }

    performance(message, meta = {}) {
        const logMessage = this.formatMessage('performance', message, meta);
        this.writeLog('performance.log', logMessage);

        if (process.env.NODE_ENV !== 'production') {
            console.log(`⚡ PERF: ${message}`, meta);
        }
    }

    // Database operation logging
    database(operation, collection, meta = {}) {
        const message = `Database ${operation} on ${collection}`;
        const logMessage = this.formatMessage('database', message, {
            operation,
            collection,
            ...meta
        });
        this.writeLog('database.log', logMessage);

        if (process.env.NODE_ENV === 'development') {
            console.log(`🗃️  DB: ${message}`, meta);
        }
    }

    // HTTP request logging
    request(req, res, responseTime) {
        const message = `${req.method} ${req.path}`;
        const meta = {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            userId: req.user ? req.user._id : null
        };

        const logMessage = this.formatMessage('request', message, meta);
        this.writeLog('access.log', logMessage);

        if (process.env.NODE_ENV === 'development') {
            const statusIcon = res.statusCode >= 400 ? '❌' :
                res.statusCode >= 300 ? '⚠️' : '✅';
            console.log(`${statusIcon} ${message} - ${res.statusCode} (${responseTime}ms)`);
        }
    }

    // Clean old logs (run this periodically)
    cleanOldLogs(daysToKeep = 30) {
        if (process.env.NODE_ENV !== 'production') return;

        try {
            const files = fs.readdirSync(this.logDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            files.forEach(file => {
                const filePath = path.join(this.logDir, file);
                const stats = fs.statSync(filePath);

                if (stats.mtime < cutoffDate) {
                    fs.unlinkSync(filePath);
                    this.info(`Cleaned old log file: ${file}`);
                }
            });
        } catch (error) {
            this.error('Failed to clean old logs', error);
        }
    }
}

// Create singleton instance
const logger = new Logger();

// Request logging middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();

    // Override res.end to capture response time
    const originalEnd = res.end;
    res.end = function (...args) {
        const responseTime = Date.now() - start;
        logger.request(req, res, responseTime);
        originalEnd.apply(this, args);
    };

    next();
};

module.exports = {
    logger,
    requestLogger
};
