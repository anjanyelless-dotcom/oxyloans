import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import askRoutes from './features/interviews/routes/ask.routes';
import errorHandler, { APIError } from './middleware/error.middleware';

dotenv.config();

const app = express();
// Reloaded with updated OpenAI credentials from .env
const PORT = process.env.PORT || 5001;

// Enable CORS for frontend interactions
app.use(cors({
  origin: '*', // In production, replace with specific domain configuration
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// API Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'AI Interview Answer Coach'
  });
});

// Register simplified ask endpoints
app.use('/api/interviews', askRoutes);

// Catch 404 routes
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new APIError(404, 'ROUTE_NOT_FOUND', `Route ${req.method} ${req.path} not found.`));
});

// Global Centralized Error Middleware
app.use(errorHandler);

// Start listening for traffic
const server = app.listen(PORT, () => {
  console.log(`Server successfully started on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
});

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });

  // Timeout shutdown after 10 seconds if connections hang
  setTimeout(() => {
    console.error('Graceful shutdown timed out, forcing shutdown.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));