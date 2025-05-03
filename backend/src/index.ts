import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config/env.config.js';
import { checkEnvVariables, env } from './schemas/env.schema.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import './config/cloudinary.config.js';
import './passport/google.strategy.js';

import attachmentRoutes from './routes/attachment.router.js';
import authRoutes from './routes/auth.router.js';
import chatRoutes from './routes/chat.router.js';
import messageRoutes from './routes/message.router.js';
import requestRoutes from './routes/request.router.js';
import userRoutes from './routes/user.router.js';

import { socketAuthenticatorMiddleware } from './middlewares/socket-auth.middleware.js';
import registerSocketHandlers from './socket/socket.js';

checkEnvVariables();

const express = (await import('express')).default;
const cors = (await import('cors')).default;
const cookieParser = (await import('cookie-parser')).default;
const morgan = (await import('morgan')).default;
const passport = (await import('passport')).default;

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { credentials: true, origin: config.clientUrl },
});

app.set('io', io);
export const userSocketIds = new Map<string, string>();

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

app.get('/', (_req, res) => {
  res.status(200).json({ running: true });
});

app.use(errorMiddleware);
registerSocketHandlers(io);

server.listen(env.PORT, () => {
  console.log(`server [STARTED] ~ http://localhost:${env.PORT}`);
  console.log(`Started in ${env.NODE_ENV} mode`);
});
