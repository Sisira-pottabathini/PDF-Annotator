const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const testRoutes = require('./routes/test');
const app = express();

// ✅ FIXED CORS configuration - REMOVED TRAILING SLASHES
const allowedOrigins = [
   // ✅ Removed trailing slash
  'https://pdf-annotator-5l4b.vercel.app/', // ✅ Removed trailing slash
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    console.log('🔍 Checking CORS for origin:', origin); // Debug log
    
    // Allow all Render subdomains and specified origins
    if (allowedOrigins.indexOf(origin) !== -1 || 
        origin.includes('.render.com') || 
        origin.includes('.vercel.app') ||
        origin.includes('localhost:') || // Added localhost wildcard
        origin.includes('127.0.0.1:')) { // Added 127.0.0.1 wildcard
      console.log('✅ CORS allowed for origin:', origin);
      callback(null, true);
    } else {
      console.log('❌ CORS blocked for origin:', origin);
      console.log('📋 Allowed origins:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/test', testRoutes);

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Enhanced Health check with more details
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true,
        message: 'PDF Annotator Backend is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        uptime: process.uptime()
    });
});

// Warmup endpoint for Render's sleep/wake cycle
app.get('/api/warmup', (req, res) => {
    res.json({ 
        success: true,
        message: 'Server is warm and ready!',
        timestamp: new Date().toISOString()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        success: true,
        message: 'PDF Annotator Backend API',
        version: '1.0.0',
        status: 'active',
        endpoints: {
            health: '/api/health',
            auth: '/api/auth',
            pdfs: '/api/pdfs',
            docs: 'Coming soon...'
        }
    });
});

// Import routes
const authRoutes = require('./routes/auth');
const pdfRoutes = require('./routes/pdfs');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/pdfs', pdfRoutes);

// Handle 404
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
        availableEndpoints: [
            'GET /api/health',
            'GET /api/warmup',
            'POST /api/auth/register',
            'POST /api/auth/login',
            'GET /api/auth/me',
            'GET /api/pdfs',
            'POST /api/pdfs/upload'
        ]
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error stack:', err.stack);
    
    // CORS error
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            message: 'CORS policy: Origin not allowed',
            allowedOrigins: allowedOrigins
        });
    }
    
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            error: err.message
        });
    }
    
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'File too large. Maximum size is 25MB'
        });
    }

    // MongoDB connection errors
    if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
        return res.status(503).json({
            success: false,
            message: 'Database connection unavailable',
            error: process.env.NODE_ENV === 'development' ? err.message : 'Service temporarily unavailable'
        });
    }
    
    // JWT errors
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Authentication failed',
            error: 'Invalid or expired token'
        });
    }
    
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// MongoDB connection with enhanced error handling
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pdf-annotator', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // Timeout after 5s
            socketTimeoutMS: 45000, // Close sockets after 45s
        });
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📊 Database: ${conn.connection.name}`);
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        console.error('💡 Make sure:');
        console.error('   1. MONGODB_URI is set in environment variables');
        console.error('   2. MongoDB Atlas IP whitelist includes 0.0.0.0/0');
        console.error('   3. Database user credentials are correct');
        process.exit(1);
    }
};

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
    console.log('❌ MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err);
});

const PORT = process.env.PORT || 5000;

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Shutting down gracefully...');
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed.');
    process.exit(0);
});

// Start server
const startServer = async () => {
    try {
        await connectDB();
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📁 Uploads directory: ${uploadsDir}`);
            console.log(`🔧 Health check: http://localhost:${PORT}/api/health`);
            console.log(`🔥 Warmup: http://localhost:${PORT}/api/warmup`);
            console.log(`🔑 Auth API: http://localhost:${PORT}/api/auth`);
            console.log(`📚 PDF API: http://localhost:${PORT}/api/pdfs`);
            
            if (process.env.NODE_ENV === 'production') {
                console.log('✅ Production mode enabled');
                console.log('🌍 CORS enabled for:', allowedOrigins);
            }
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();