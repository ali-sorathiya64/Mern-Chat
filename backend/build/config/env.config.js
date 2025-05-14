import { env } from "../schemas/env.schema.js";
const developmentConfig = {
    clientUrl: "http://localhost:3000",
    callbackUrl: `http://localhost:${env.PORT}/api/v1/auth/google/callback`,
};
const productionConfig = {
    clientUrl: "http://localhost:3000",
    callbackUrl: "https://mern-chat-3-ak2b.onrender.com/api/v1/auth/google/callback"
};
export const config = env.NODE_ENV === 'DEVELOPMENT' ? developmentConfig : productionConfig;
