import express from 'express';
import { createServer } from 'http';
import passport from 'passport';
import { Server } from 'socket.io';
import { config } from './config/env.config.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import './passport/google.strategy.js';
import { checkEnvVariables, env } from './schemas/env.schema.js';
import './config/cloudinary.config.js';
import attachmentRoutes from './routes/attachment.router.js';
import authRoutes from './routes/auth.router.js';
import chatRoutes from './routes/chat.router.js';
import messageRoutes from './routes/message.router.js';
import requestRoutes from './routes/request.router.js';
import userRoutes from './routes/user.router.js';
import { socketAuthenticatorMiddleware } from './middlewares/socket-auth.middleware.js';
import registerSocketHandlers from './socket/socket.js';
checkEnvVariables();
const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        credentials: true,
        origin: config.clientUrl,
    },
});
app.set('io', io);
export const userSocketIds = new Map();
const bootstrap = async () => {
    const { default: cors } = await import('cors');
    const { default: cookieParser } = await import('cookie-parser');
    const { default: morgan } = await import('morgan');
    app.use(cors({ credentials: true, origin: config.clientUrl }));
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
    io.use(socketAuthenticatorMiddleware);
    app.get('/', (_, res) => {
        res.status(200).json({ running: true });
    });
    app.use(errorMiddleware);
    registerSocketHandlers(io);
    server.listen(env.PORT, () => {
        console.log(`Server [STARTED] ~ http://localhost:${env.PORT}`);
        console.log(`Started in ${env.NODE_ENV} mode`);
    });
};
bootstrap();
