import { transporter } from "../config/nodemailer.config.js";
import { otpVerificationBody, privateKeyRecoveryBody, resetPasswordBody, welcomeEmailBody } from "../constants/emails/email.body.js";
import { otpVerificationSubject, privateKeyRecoverySubject, resetPasswordSubject, welcomeEmailSubject } from "../constants/emails/email.subject.js";
import { env } from "../schemas/env.schema.js";
export const sendMail = async (to, username, type, resetUrl, otp, verificationUrl) => {
    await transporter.sendMail({
        from: env.EMAIL,
        to,
        subject: type === 'OTP' ? otpVerificationSubject : type === 'resetPassword' ? resetPasswordSubject : type === 'welcome' ? welcomeEmailSubject : privateKeyRecoverySubject,
        html: type === 'OTP' ? otpVerificationBody(username, otp) : type === 'resetPassword' ? resetPasswordBody(username, resetUrl) : type === 'welcome' ? welcomeEmailBody(username) : privateKeyRecoveryBody(username, verificationUrl),
    });
};
