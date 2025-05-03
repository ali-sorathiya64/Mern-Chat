import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Safe imports for common packages
import * as cookieParserImport from 'cookie-parser';
import * as corsImport from 'cors';
import * as morganImport from 'morgan';
import * as passportImport from 'passport';

import './config/cloudinary.config.js';
import { config } from './config/env.config.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import './passport/google.strategy.js';
import { checkEnvVariables, env } from './schemas/env.schema.js';

// Routes
import attachmentRoutes from './routes/attachment.router.js';
import authRoutes from './routes/auth.router.js';
import chatRoutes from './routes/chat.router.js';
import messageRoutes from './routes/message.router.js';
import requestRoutes from './routes/request.router.js';
import userRoutes from './routes/user.router.js';

import { socketAuthenticatorMiddleware } from './middlewares/socket-auth.middleware.js';
import registerSocketHandlers from './socket/socket.js';

// Validate env
checkEnvVariables();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { credentials: true, origin: config.clientUrl }
});

// Global IO
app.set("io", io);

// userSocketIds map
export const userSocketIds = new Map<string, string>();

// Middleware setup with fallback for CommonJS exports
const cookieParser = cookieParserImport.default || cookieParserImport;
const cors = corsImport.default || corsImport;
const morgan = morganImport.default || morganImport;
const passport = passportImport.default || passportImport;

// Middleware
app.use(cors({ credentials: true, origin: config.clientUrl }));
app.use(passport.initialize());
app.use(express.json());
app.use(cookieParser());
app.use(morgan('tiny'));

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/request", requestRoutes);
app.use("/api/v1/message", messageRoutes);
app.use("/api/v1/attachment", attachmentRoutes);

// Socket Auth
io.use(socketAuthenticatorMiddleware);

// Test route
app.get("/", (_: Request, res: Response) => {
  res.status(200).json({ running: true });
});

// Error Middleware
app.use(errorMiddleware);

// Register Socket Events
registerSocketHandlers(io);

// Start server
server.listen(env.PORT, () => {
  console.log(`Server [STARTED] ~ http://localhost:${env.PORT}`);
  console.log(`Started in ${env.NODE_ENV} mode`);
});
