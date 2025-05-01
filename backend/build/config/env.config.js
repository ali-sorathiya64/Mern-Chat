import { env } from "../schemas/env.schema.js";
const developmentConfig = {
    clientUrl: "http://localhost:3000",
    callbackUrl: `http://localhost:${env.PORT}/api/v1/auth/google/callback`,
};
const productionConfig = {
    clientUrl: "https://mernchat.in",
    callbackUrl: "https://aesehi.online/api/v1/auth/google/callback"
};
export const config = env.NODE_ENV === 'DEVELOPMENT' ? developmentConfig : productionConfig;
