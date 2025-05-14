import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import morgan from 'morgan';
import passport from 'passport';
import { Server } from 'socket.io';
import './config/cloudinary.config.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import './passport/google.strategy.js';
import { checkEnvVariables, env } from './schemas/env.schema.js';
import attachmentRoutes from './routes/attachment.router.js';
import authRoutes from './routes/auth.router.js';
import chatRoutes from './routes/chat.router.js';
import messageRoutes from './routes/message.router.js';
import requestRoutes from './routes/request.router.js';
import userRoutes from './routes/user.router.js';
import { socketAuthenticatorMiddleware } from './middlewares/socket-auth.middleware.js';
import registerSocketHandlers from './socket/socket.js';
// ✅ Validate environment variables
checkEnvVariables();
const app = express();
const server = createServer(app);
// ✅ Allow CORS from localhost only (for development)
const allowedOrigins = ['http://localhost:3000'];
// ✅ Socket.io server setup with proper CORS config
const io = new Server(server, {
    cors: {
        credentials: true,
        origin: allowedOrigins
    }
});
// ✅ Attach io globally
app.set('io', io);
// ✅ Map to store user socket ids
export const userSocketIds = new Map();
// ✅ Global middlewares
app.use(cors({ credentials: true, origin: allowedOrigins }));
app.use(passport.initialize());
app.use(express.json());
app.use(cookieParser());
app.use(morgan('tiny'));
// ✅ API route handlers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/request', requestRoutes);
app.use('/api/v1/message', messageRoutes);
app.use('/api/v1/attachment', attachmentRoutes);
// ✅ Socket auth middleware
io.use(socketAuthenticatorMiddleware);
// ✅ Health check route
app.get('/', (_, res) => {
    res.status(200).json({ running: true });
});
// ✅ Error middleware
app.use(errorMiddleware);
// ✅ Register socket events
registerSocketHandlers(io);
// ✅ Start server
server.listen(env.PORT, () => {
    console.log(`server [STARTED] ~ http://localhost:${env.PORT}`);
    if (env.NODE_ENV === 'PRODUCTION') {
        console.log('Started in PRODUCTION mode');
    }
    else {
        console.log('Started in DEVELOPMENT mode');
    }
});
