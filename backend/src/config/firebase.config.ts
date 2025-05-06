import admin from "firebase-admin";

if (!admin.apps.length) {
  const credString = process.env.FIREBASE_ADMIN_CRED;

  if (!credString) {
    throw new Error("FIREBASE_ADMIN_CRED not found in environment variables");
  }

  const credentials = JSON.parse(credString);

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: credentials.project_id,
      privateKey: credentials.private_key.replace(/\\n/g, "\n"),
      clientEmail: credentials.client_email,
    }),
  });
}

export const messaging = admin.messaging();
