import admin from "firebase-admin";
import dotenv from "dotenv"
// Parse Firebase credentials from environment variable
const credentials = JSON.parse(process.env.FIREBASE_ADMIN_CRED!);


dotenv.config();
// Define the type for serviceAccount
const serviceAccount: admin.ServiceAccount = {
  projectId: credentials.project_id,
  privateKey: credentials.private_key,
  clientEmail: credentials.client_email,
};

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const messaging = admin.messaging();
