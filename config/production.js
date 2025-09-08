const rateLimit = require('express-rate-limit');

// Production rate limiting configurations
const rateLimitConfigs = {
    // Global rate limiting - most permissive
    global: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000, // 1000 requests per 15 minutes per IP
        message: {
            error: 'Too many requests from this IP, please try again later.',
            retryAfter: 15 * 60
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                error: 'Rate limit exceeded',
                message: 'Too many requests from this IP, please try again later.',
                retryAfter: 15 * 60,
                timestamp: new Date().toISOString()
            });
        }
    }),

    // API rate limiting - moderate
    api: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 500, // 500 API requests per 15 minutes per IP
        message: {
            error: 'Too many API requests from this IP, please try again later.',
            retryAfter: 15 * 60
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                error: 'API rate limit exceeded',
                message: 'Too many API requests from this IP, please try again later.',
                retryAfter: 15 * 60,
                timestamp: new Date().toISOString()
            });
        }
    }),

    // Auth rate limiting - strict
    auth: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10, // 10 auth attempts per 15 minutes per IP
        message: {
            error: 'Too many authentication attempts from this IP, please try again later.',
            retryAfter: 15 * 60
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                error: 'Authentication rate limit exceeded',
                message: 'Too many authentication attempts from this IP, please try again later.',
                retryAfter: 15 * 60,
                timestamp: new Date().toISOString()
            });
        }
    }),

    // File upload rate limiting - very strict
    upload: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 50, // 50 uploads per hour per IP
        message: {
            error: 'Too many file uploads from this IP, please try again later.',
            retryAfter: 60 * 60
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                error: 'Upload rate limit exceeded',
                message: 'Too many file uploads from this IP, please try again later.',
                retryAfter: 60 * 60,
                timestamp: new Date().toISOString()
            });
        }
    }),

    // Search rate limiting - moderate
    search: rateLimit({
        windowMs: 10 * 60 * 1000, // 10 minutes
        max: 100, // 100 search requests per 10 minutes per IP
        message: {
            error: 'Too many search requests from this IP, please try again later.',
            retryAfter: 10 * 60
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                error: 'Search rate limit exceeded',
                message: 'Too many search requests from this IP, please try again later.',
                retryAfter: 10 * 60,
                timestamp: new Date().toISOString()
            });
        }
    })
};

// Production security headers configuration
const securityConfig = {
    helmet: {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
                fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
                imgSrc: ["'self'", "data:", "https:", "blob:", "https://res.cloudinary.com"],
                scriptSrc: ["'self'", "https://js.stripe.com"],
                connectSrc: ["'self'", "https://api.stripe.com", "https://api.cloudinary.com"],
                frameSrc: ["'self'", "https://js.stripe.com"],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                upgradeInsecureRequests: []
            }
        },
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        }
    },

    cors: {
        origin: function (origin, callback) {
            const allowedOrigins = [
                'http://localhost:3000',
                'http://localhost:5173',
                'http://localhost:5174',
                'https://hotel-mania-pqzv.vercel.app',
                'https://hotel-mania-two.vercel.app',
                'https://hotel-mania.vercel.app'
            ];

            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);

            if (allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                console.warn(`Blocked CORS request from origin: ${origin}`);
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With',
            'Accept',
            'Origin'
        ],
        exposedHeaders: ['X-Total-Count'],
        optionsSuccessStatus: 200
    }
};

// Database connection pool configuration for production
const dbConfig = {
    production: {
        maxPoolSize: 20, // Maximum number of connections
        minPoolSize: 5,  // Minimum number of connections
        serverSelectionTimeoutMS: 10000, // 10 seconds
        socketTimeoutMS: 45000, // 45 seconds
        connectTimeoutMS: 10000, // 10 seconds
        retryWrites: true,
        retryReads: true,
        readPreference: 'primary',
        writeConcern: {
            w: 'majority',
            j: true,
            wtimeout: 5000
        }
    },
    development: {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 30000,
        connectTimeoutMS: 5000,
        retryWrites: true,
        retryReads: true
    }
};

// Performance monitoring configuration
const performanceConfig = {
    compression: {
        level: 6, // Compression level (1-9, higher = better compression but slower)
        threshold: 1024, // Only compress responses larger than 1kb
        filter: (req, res) => {
            // Don't compress if the request has a "x-no-compression" header
            if (req.headers['x-no-compression']) {
                return false;
            }
            // Use compression filter
            return true;
        }
    },

    // Body parser limits
    bodyParser: {
        json: { limit: '10mb' },
        urlencoded: { limit: '10mb', extended: true, parameterLimit: 1000 }
    }
};

module.exports = {
    rateLimitConfigs,
    securityConfig,
    dbConfig,
    performanceConfig
};
