import admin from "firebase-admin";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
dotenv.config(); // Load environment variables
// Get the current directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load Firebase credentials
const credentialsPath = path.join(__dirname, "../firebase-admin-cred.json");
const credentialsRaw = await readFile(credentialsPath, "utf-8");
const credentials = JSON.parse(credentialsRaw);
// Define the type for serviceAccount
const serviceAccount = {
    projectId: credentials.project_id,
    privateKey: credentials.private_key.replace(/\\n/g, "\n"), // Fix formatting
    clientEmail: credentials.client_email,
};
// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}
// Export Firebase messaging
export const messaging = admin.messaging();
