import { messaging } from "../config/firebase.config.js";
import { notificationTitles } from "../constants/notification-title.contant.js";
export const calculateSkip = (page, limit) => {
    return Math.ceil((page - 1) * limit);
};
export const getRandomIndex = (length) => {
    return Math.floor(Math.random() * length);
};
export const sendPushNotification = ({ fcmToken, body, title }) => {
    try {
        console.log('push notification called for fcmToken', fcmToken);
        const link = '/';
        const payload = {
            token: fcmToken,
            notification: {
                title: title ? title : `${notificationTitles[getRandomIndex(notificationTitles.length)]}`,
                body,
                imageUrl: "https://res.cloudinary.com/djr9vabwz/image/upload/v1739560136/logo192_lqsucz.png"
            },
            webpush: link && {
                fcmOptions: {
                    link,
                },
            },
        };
        messaging.send(payload);
    }
    catch (error) {
        console.log('error while sending push notification', error);
    }
};
export const convertBufferToBase64 = (buffer) => {
    return Buffer.from(buffer).toString("base64");
};
export const bufferToBase64 = (buffer) => {
    return buffer.toString("base64");
};
