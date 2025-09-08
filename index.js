const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('Missing required environment variables:', missingEnvVars);
    if (process.env.NODE_ENV === 'production') {
        throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }
}

// Log environment status (without sensitive data)
console.log('Environment loaded:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    MONGODB_URI: process.env.MONGODB_URI ? '✓ Set' : '✗ Missing',
    JWT_SECRET: process.env.JWT_SECRET ? '✓ Set' : '✗ Missing'
});

// Initialize express
const app = express();

// Configure trust proxy for Railway and other proxy environments
app.set('trust proxy', true);

// Graceful shutdown handling
let server;
const gracefulShutdown = (signal) => {
    console.log(`Received ${signal}. Starting graceful shutdown...`);

    if (server) {
        server.close(() => {
            console.log('HTTP server closed.');

            // Close database connection
            if (mongoose.connection.readyState === 1) {
                mongoose.connection.close(() => {
                    console.log('MongoDB connection closed.');
                    process.exit(0);
                });
            } else {
                process.exit(0);
            }
        });

        // Force close after 10 seconds
        setTimeout(() => {
            console.log('Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 10000);
    } else {
        process.exit(0);
    }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Basic error handling
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Production security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", "https://api.stripe.com"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// Compression middleware for better performance
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}

// Global rate limiting
const globalRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV !== 'production'
});

// API-specific rate limiting
const apiRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: {
        error: 'Too many API requests from this IP, please try again later.',
        retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV !== 'production'
});

// Auth-specific rate limiting (stricter)
const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        error: 'Too many authentication attempts from this IP, please try again later.',
        retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV !== 'production'
});

// Apply global rate limiting
app.use(globalRateLimit);

// CORS configuration
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://hotel-mania-front.vercel.app',
        'http://localhost:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check route (must be early)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Root route
app.get('/', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Hotel Management System API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Database connection middleware for API routes
const ensureDbConnection = async (req, res, next) => {
    try {
        if (mongoose.connection.readyState === 1) {
            return next();
        }

        if (mongoose.connection.readyState === 0) {
            const connectDB = require('./config/db');
            await connectDB();
            return next();
        }

        if (mongoose.connection.readyState === 2) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return next();
        }

        return res.status(503).json({
            error: 'Database connection not available',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Database connection middleware error:', error);
        return res.status(503).json({
            error: 'Database connection failed',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

// Test route
app.get('/api/test', (req, res) => {
    res.status(200).json({
        message: 'API routing is working',
        timestamp: new Date().toISOString()
    });
});

// Handle favicon.ico requests
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// Load routes conditionally
async function initializeApp() {
    try {
        console.log('Initializing application...');

        // Load routes
        const routesToLoad = [
            { name: 'authRoutes', path: './routes/authRoutes', endpoint: '/api/auth' },
            { name: 'roomRoutes', path: './routes/roomRoutes', endpoint: '/api/rooms' },
            { name: 'roomCategoryRoutes', path: './routes/roomCategoryRoutes', endpoint: '/api/room-categories' },
            { name: 'menuRoutes', path: './routes/menuRoutes', endpoint: '/api/menu' },
            { name: 'foodCategoryRoutes', path: './routes/foodCategoryRoutes', endpoint: '/api/food-categories' },
            { name: 'galleryRoutes', path: './routes/galleryRoutes', endpoint: '/api/gallery' },
            { name: 'serviceRoutes', path: './routes/serviceRoutes', endpoint: '/api/services' },
            { name: 'packageRoutes', path: './routes/packageRoutes', endpoint: '/api/packages' },
            { name: 'testimonialRoutes', path: './routes/testimonials', endpoint: '/api/testimonials' },
            { name: 'utilRoutes', path: './routes/utilRoutes', endpoint: '/api/utils' },
            { name: 'bookingRoutes', path: './routes/bookingRoutes', endpoint: '/api/bookings' },
            { name: 'orderRoutes', path: './routes/orderRoutes', endpoint: '/api/orders' },
            { name: 'employeeRoutes', path: './routes/employeeRoutes', endpoint: '/api/employees' }
        ];

        for (const route of routesToLoad) {
            try {
                console.log(`Loading ${route.name}...`);
                const routeModule = require(route.path);

                if (route.name === 'utilRoutes') {
                    app.use(route.endpoint, routeModule);
                } else if (route.name === 'authRoutes') {
                    app.use(route.endpoint, authRateLimit, ensureDbConnection, routeModule);
                } else {
                    app.use(route.endpoint, apiRateLimit, ensureDbConnection, routeModule);
                }

                console.log(`✅ ${route.name} loaded successfully`);
            } catch (error) {
                console.error(`❌ Error loading ${route.name}:`, error.message);

                app.use(route.endpoint, (req, res) => {
                    res.status(503).json({
                        error: `${route.name} temporarily unavailable`,
                        message: error.message,
                        timestamp: new Date().toISOString()
                    });
                });
            }
        }

        console.log('All routes processing completed');

        // Try to connect to MongoDB
        try {
            const connectDB = require('./config/db');
            console.log('Connecting to database...');
            await connectDB();
            console.log('Database connected successfully');
        } catch (dbError) {
            console.error('Database connection failed, but continuing with routes:', dbError.message);
        }

        // API health endpoint
        app.get('/api/health', (req, res) => {
            res.status(200).json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                environment: process.env.NODE_ENV || 'development',
                database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
            });
        });

        // 404 handler (must be after all routes)
        app.use((req, res) => {
            res.status(404).json({
                error: 'Route not found',
                path: req.path,
                method: req.method,
                timestamp: new Date().toISOString()
            });
        });

        // Global error handling middleware (must be last)
        app.use((err, req, res, next) => {
            console.error('Global error handler:', err.stack);

            if (err.name === 'ValidationError') {
                const errors = Object.values(err.errors).map(e => e.message);
                return res.status(400).json({
                    error: 'Validation Error',
                    messages: errors,
                    timestamp: new Date().toISOString()
                });
            }

            if (err.code === 11000) {
                const field = Object.keys(err.keyValue)[0];
                return res.status(400).json({
                    error: 'Duplicate Entry',
                    message: `${field} already exists`,
                    timestamp: new Date().toISOString()
                });
            }

            if (err.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    error: 'Invalid token',
                    timestamp: new Date().toISOString()
                });
            }

            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    error: 'Token expired',
                    timestamp: new Date().toISOString()
                });
            }

            res.status(err.status || 500).json({
                error: process.env.NODE_ENV === 'production'
                    ? 'Internal server error'
                    : err.message,
                timestamp: new Date().toISOString(),
                ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
            });
        });

        console.log('Application initialization completed');

        // Start server for all environments
        const PORT = process.env.PORT || 5000;
        server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`✅ Server running on port ${PORT}`);
            console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 Health check available at: http://localhost:${PORT}/health`);
        });

        // Handle server errors
        server.on('error', (err) => {
            console.error('Server error:', err);
            process.exit(1);
        });

    } catch (error) {
        console.error('Error during app initialization:', error);
        process.exit(1);
    }
}

// Initialize the app
initializeApp().catch(error => {
    console.error('Failed to initialize app:', error);
    process.exit(1);
});

module.exports = app;