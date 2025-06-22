import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Request, Response } from 'express';
import { createServer } from 'http';
import morgan from 'morgan';
import passport from 'passport';
import { Server } from 'socket.io';
import './config/cloudinary.config.js';
import { config } from './config/env.config.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import './passport/google.strategy.js';
import { checkEnvVariables, env } from './schemas/env.schema.js';


import { socketAuthenticatorMiddleware } from './middlewares/socket-auth.middleware.js';
import registerSocketHandlers from './socket/socket.js';


import attachmentRoutes from './routes/attachment.router.js';
import authRoutes from './routes/auth.router.js';
import chatRoutes from './routes/chat.router.js';
import messageRoutes from './routes/message.router.js';
import requestRoutes from './routes/request.router.js';
import userRoutes from './routes/user.router.js';

// Environment validation
checkEnvVariables();

const app = express();
const server = createServer(app);

const allowedOrigins = [
  config.clientUrl,
  'http://localhost:3000',
  'https://mernendtoendchatapp.vercel.app',
];

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`Blocked by CORS: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie'],
};



app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); 
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000,
  path: '/socket.io' 
});


io.use(socketAuthenticatorMiddleware);


app.set('io', io);
export const userSocketIds = new Map<string, string>();


app.use(passport.initialize());
app.use(express.json());
app.use(cookieParser());
app.use(morgan('tiny'));



app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/request', requestRoutes);
app.use('/api/v1/message', messageRoutes);
app.use('/api/v1/attachment', attachmentRoutes);


app.get('/', (_: Request, res: Response) => {
  res.status(200).json({ 
    status: 'running',
    environment: env.NODE_ENV,
    allowedOrigins
  });
});


app.use(errorMiddleware);



registerSocketHandlers(io);



server.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`Allowed CORS origins: ${allowedOrigins.join(', ')}`);
});



process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled Rejection:', err);
});


process.on('uncaughtException', (err: Error) => {
  console.error('Uncaught Exception:', err);
});
