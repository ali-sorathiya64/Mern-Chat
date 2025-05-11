import { prisma } from "../lib/prisma.lib.js";
import { deleteFilesFromCloudinary, uploadFilesToCloudinary } from "../utils/auth.util.js";
import { sendMail } from "../utils/email.util.js";
import { CustomError, asyncErrorHandler } from "../utils/error.utils.js";
const emailTemplates = {
    welcome: 'welcome',
    resetPassword: 'resetPassword',
    otpVerification: 'OTP',
    privateKeyRecovery: 'privateKeyRecovery'
};
export const updateUser = asyncErrorHandler(async (req, res, next) => {
    if (!req.file) {
        return next(new CustomError("Please provide an image", 400));
    }
    try {
        const existingAvatarPublicId = req.user.avatarCloudinaryPublicId;
        let uploadResult;
        if (existingAvatarPublicId) {
            await deleteFilesFromCloudinary({ publicIds: [existingAvatarPublicId] });
        }
        const uploadResults = await uploadFilesToCloudinary({ files: [req.file] });
        const uploadResponse = uploadResults?.[0];
        if (!uploadResponse?.secure_url) {
            throw new Error("File upload failed");
        }
        uploadResult = uploadResponse;
        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                avatar: uploadResult.secure_url,
                avatarCloudinaryPublicId: uploadResult.public_id
            },
            select: {
                id: true,
                name: true,
                username: true,
                avatar: true,
                email: true,
                createdAt: true,
                updatedAt: true,
                emailVerified: true,
                publicKey: true,
                notificationsEnabled: true,
                verificationBadge: true,
                fcmToken: true,
                oAuthSignup: true,
                avatarCloudinaryPublicId: true
            }
        });
        // Handle emailVerified conversion
        // Fix for the emailVerified type checking
        const emailVerified = typeof updatedUser.emailVerified === 'boolean'
            ? (updatedUser.emailVerified ? new Date() : null)
            : updatedUser.emailVerified;
        const response = {
            id: updatedUser.id,
            name: updatedUser.name,
            username: updatedUser.username,
            avatar: updatedUser.avatar ?? undefined,
            email: updatedUser.email,
            createdAt: updatedUser.createdAt,
            updatedAt: updatedUser.updatedAt,
            emailVerified, // Now properly typed as Date | null
            publicKey: updatedUser.publicKey ?? null,
            notificationsEnabled: updatedUser.notificationsEnabled ?? false,
            verificationBadge: updatedUser.verificationBadge ?? false,
            fcmToken: updatedUser.fcmToken ?? null,
            oAuthSignup: updatedUser.oAuthSignup ?? false,
            avatarCloudinaryPublicId: updatedUser.avatarCloudinaryPublicId ?? null
        };
        return res.status(200).json(response);
    }
    catch (error) {
        console.error("Update error:", error);
        return next(new CustomError("Failed to update profile", 500));
    }
});
export const testEmailHandler = asyncErrorHandler(async (req, res, next) => {
    const emailType = req.query.emailType;
    if (!emailType || !req.user.email) {
        return res.status(400).json({ message: "Missing required parameters" });
    }
    try {
        // Validate emailType
        if (!(emailType in emailTemplates)) {
            return res.status(400).json({ message: "Invalid email type" });
        }
        const template = emailTemplates[emailType];
        const link = emailType === 'resetPassword' ? 'https://mernchat.online' : undefined;
        const otp = emailType === 'otpVerification' ? "3412" : undefined;
        const recoveryLink = emailType === 'privateKeyRecovery' ? 'https://mernchat.online' : undefined;
        await sendMail(req.user.email, req.user.username, template, link, otp, recoveryLink);
        return res.status(200).json({ message: `${emailType} email sent successfully` });
    }
    catch (error) {
        console.error("Email error:", error);
        return next(new CustomError("Failed to send email", 500));
    }
});
