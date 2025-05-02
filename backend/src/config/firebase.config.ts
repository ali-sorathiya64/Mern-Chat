import admin from "firebase-admin";
import credentials from "../firebase-admin-cred.json" assert { type: "json" };

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
