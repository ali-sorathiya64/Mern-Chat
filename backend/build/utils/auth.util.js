import { v2 as cloudinary } from 'cloudinary';
import { convertBufferToBase64 } from './generic.js';
const thirtyDaysInMilliseconds = 30 * 24 * 60 * 60 * 1000;
// const cookieOptions:CookieOptions = {
//     maxAge:thirtyDaysInMilliseconds,
//     httpOnly:true,
//     path:"/",
//     priority:"high",
//     secure:true,
//     sameSite:env.NODE_ENV==='DEVELOPMENT'?"lax":"none",
//     domain: env.NODE_ENV === 'DEVELOPMENT' ? 'localhost' : 'aesehi.online',
//     partitioned:true,
// }
export const uploadFilesToCloudinary = async ({ files }) => {
    try {
        const uploadPromises = files.map(file => cloudinary.uploader.upload(file.path));
        const result = await Promise.all(uploadPromises);
        return result;
    }
    catch (error) {
        console.log('Error uploading files to cloudinary');
        console.log(error);
    }
};
export const deleteFilesFromCloudinary = async ({ publicIds }) => {
    try {
        await cloudinary.uploader.destroy(publicIds[0]);
        const deletePromises = publicIds.map(publicId => cloudinary.uploader.destroy(publicId));
        const uploadResult = await Promise.all(deletePromises);
        return uploadResult;
    }
    catch (error) {
        console.log('Error deleting files from cloudinary');
        console.log(error);
    }
};
export const uploadEncryptedAudioToCloudinary = async ({ buffer }) => {
    try {
        const base64Audio = `data:audio/webm;base64,${convertBufferToBase64(buffer)}`; // Adjust MIME type if needed
        const uploadResult = await cloudinary.uploader.upload(base64Audio, {
            resource_type: "raw", // "raw" for non-standard formats (or "video" for MP4)
            folder: "encrypted-audio",
        });
        return uploadResult;
    }
    catch (error) {
        console.error("Error uploading encrypted audio to Cloudinary:", error);
    }
};
export const uploadAudioToCloudinary = async ({ buffer }) => {
    try {
        const base64Audio = `data:audio/webm;base64,${convertBufferToBase64(buffer)}`; // Adjust MIME type if needed
        const uploadResult = await cloudinary.uploader.upload(base64Audio, {
            resource_type: "raw", // "raw" for non-standard formats (or "video" for MP4)
            folder: "group-audio",
        });
        return uploadResult;
    }
    catch (error) {
        console.error("Error uploading audio to Cloudinary:", error);
    }
};
export const getSecureUserInfo = (user) => {
    return {
        id: user._id,
        name: user.name,
        username: user.username,
        avatar: user.avatar?.secureUrl,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        verified: user.verified,
        publicKey: user?.publicKey,
        notificationsEnabled: user.notificationsEnabled,
        verificationBadge: user.verificationBadge,
        fcmTokenExists: user.fcmToken?.length ? true : false,
        oAuthSignup: user.oAuthSignup
    };
};
