// src/index.ts
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import morgan from "morgan";
import passport3 from "passport";
import { Server } from "socket.io";

// src/config/cloudinary.config.ts
import { v2 as cloudinary } from "cloudinary";

// src/schemas/env.schema.ts
import { config } from "dotenv";
import { z } from "zod";
var envFile = `.env.${process.env.NODE_ENV === "DEVELOPMENT" ? "development" : "production"}`;
config({ path: envFile });
var envSchema = z.object({
  NODE_ENV: z.enum(["DEVELOPMENT", "PRODUCTION"]).default("DEVELOPMENT"),
  PORT: z.string({ required_error: "PORT is required" }).max(4, "Port cannot be more than 4 digits").min(4, "Port number cannot be lesser than 4 digits"),
  JWT_SECRET: z.string({ required_error: "JWT_SECRET is required" }),
  JWT_TOKEN_EXPIRATION_DAYS: z.string({ required_error: "JWT_TOKEN_EXPIRATION_DAYS is required" }).min(1, "JWT_TOKEN_EXPIRATION_DAYS cannot be less than 1"),
  EMAIL: z.string().email("Please provide a valid email"),
  PASSWORD: z.string({ required_error: "Password for email is required" }),
  OTP_EXPIRATION_MINUTES: z.string({ required_error: "OTP_EXPIRATION_MINUTES is required" }),
  PASSWORD_RESET_TOKEN_EXPIRATION_MINUTES: z.string({ required_error: "PASSWORD_RESET_TOKEN_EXPIRATION_MINUTES is required" }),
  CLOUDINARY_CLOUD_NAME: z.string({ required_error: "CLOUDINARY_CLOUD_NAME is required" }),
  CLOUDINARY_API_KEY: z.string({ required_error: "CLOUDINARY_API_KEY is required" }),
  CLOUDINARY_API_SECRET: z.string({ required_error: "CLOUDINARY_API_SECRET is required" }),
  GOOGLE_CLIENT_ID: z.string({ required_error: "GOOGLE_CLIENT_ID is required" }),
  GOOGLE_CLIENT_SECRET: z.string({ required_error: "GOOGLE_CLIENT_SECRET is required" }),
  GOOGLE_APPLICATION_CREDENTIALS: z.string({ required_error: "GOOGLE_APPLICATION_CREDENTIALS is required" }),
  PRIVATE_KEY_RECOVERY_SECRET: z.string({ required_error: "PRIVATE_KEY_RECOVERY_SECRET is required" }),
  DATABASE_URL: z.string({ required_error: "DATABASE_URL is required" }),
  DIRECT_URL: z.string({ required_error: "DIRECT_URL is required" })
});
var checkEnvVariables = () => {
  const parsedEnv = envSchema.safeParse(process.env);
  if (!parsedEnv.success) {
    console.error("\u274C Invalid environment variables:", parsedEnv.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsedEnv.data;
};
var env = checkEnvVariables();

// src/config/cloudinary.config.ts
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET
});

// src/config/env.config.ts
var developmentConfig = {
  clientUrl: "http://localhost:3000",
  callbackUrl: `http://localhost:${env.PORT}/api/v1/auth/google/callback`
};
var productionConfig = {
  clientUrl: "https://mernchat.in",
  callbackUrl: "https://aesehi.online/api/v1/auth/google/callback"
};
var config2 = env.NODE_ENV === "DEVELOPMENT" ? developmentConfig : productionConfig;

// src/utils/error.utils.ts
var CustomError = class extends Error {
  constructor(message = "Interval Server Error", statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
};
var asyncErrorHandler = (func) => async (req, res, next) => {
  try {
    await func(req, res, next);
  } catch (error) {
    next(error);
  }
};

// src/middlewares/error.middleware.ts
import { ZodError } from "zod";
import jwt from "jsonwebtoken";
import { MulterError } from "multer";
var errorMiddleware = (err, req, res, next) => {
  console.log(err);
  let message;
  let statusCode = 500;
  if (err instanceof ZodError) {
    message = err.issues.map((issue) => issue.message).join(", ");
    statusCode = 400;
  } else if (err instanceof CustomError) {
    message = err.message;
    statusCode = err.statusCode;
  } else if (err instanceof Error) {
    message = err.message;
    statusCode = 500;
    if (err instanceof jwt.TokenExpiredError) {
      statusCode = 401;
      message = "Token expired, please login again";
    }
    if (err instanceof jwt.JsonWebTokenError) {
      statusCode = 401;
      message = "Invalid Token, please login again";
    }
    if (err instanceof MulterError) {
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        statusCode = 400;
        message = "Too many files uploaded. Maximum 5 files allowed.";
      }
    }
  } else {
    return res.status(500).json({ message: "Internal Server Error" });
  }
  return res.status(statusCode).json({ message });
};

// src/passport/google.strategy.ts
import bcrypt from "bcryptjs";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

// src/constants/file.constant.ts
var MAX_FILE_SIZE = 5 * 1024 * 1024;
var ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];
var DEFAULT_AVATAR = "https://res.cloudinary.com/dh5fjdce9/image/upload/v1717842288/defaultAvatar_q2y2az.png";
var ACCEPTED_FILE_MIME_TYPES = ["application/pdf", "application/msword", ...ACCEPTED_IMAGE_TYPES];

// src/lib/prisma.lib.ts
import { PrismaClient } from "@prisma/client";
var prisma = new PrismaClient({
  // log: ["query"],
});

// src/passport/google.strategy.ts
passport.use(new GoogleStrategy(
  {
    clientID: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    callbackURL: config2.callbackUrl
  },
  async function(accessToken, refreshToken, profile, done) {
    try {
      if (profile.emails && profile.emails[0].value && profile.displayName) {
        const isExistingUser = await prisma.user.findUnique({ where: { email: profile.emails[0].value } });
        if (isExistingUser) {
          const transformedUser = {
            id: isExistingUser.id,
            username: isExistingUser.username,
            name: isExistingUser.name,
            avatar: isExistingUser.avatar,
            email: isExistingUser.email,
            emailVerified: isExistingUser.emailVerified,
            newUser: false,
            googleId: profile.id
          };
          done(null, transformedUser);
        } else {
          let avatarUrl = DEFAULT_AVATAR;
          if (profile.photos && profile.photos[0].value) {
            avatarUrl = profile.photos[0].value;
          }
          const newUser = await prisma.user.create({
            data: {
              username: profile.displayName,
              name: profile.name?.givenName,
              avatar: avatarUrl,
              email: profile.emails[0].value,
              hashedPassword: await bcrypt.hash(profile.id, 10),
              emailVerified: true,
              oAuthSignup: true,
              googleId: profile.id
            },
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true,
              email: true,
              emailVerified: true,
              googleId: true
            }
          });
          done(null, { ...newUser, newUser: true });
        }
      } else {
        throw new Error("Some Error occured");
      }
    } catch (error) {
      console.log(error);
      done("Some error occured", void 0);
    }
  }
));

// src/routes/attachment.router.ts
import { Router } from "express";

// src/utils/auth.util.ts
import { v2 as cloudinary2 } from "cloudinary";

// src/config/firebase.config.ts
import admin from "firebase-admin";

// src/firebase-admin-cred.json
var firebase_admin_cred_default = {
  type: "service_account",
  project_id: "chat-app-d94f3",
  private_key_id: "c27f16d0dd01d8d3f42c1a05170df99624e8471c",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC20v7LgTjCS+is\nz+WMe4edsPNClsqagDuA7PIoiMCJ0xwxvyMZ5Fhv5M6rEcIZOmwzNfelUBOwRYLc\naJc1x+jF56yi3S5lRvMbKHUGkvG8IxnTXIgywDgnBnibmnTBLSxyv9caKl64XH4A\nh8cPD6EtOT8AbAxmLvgIYiDv3q4TiQNK3hHYZD+5qjiH+bolrpFK5xIEVpPTWvNL\n5ai9Ay+6342kUX4Q+X8h0P74S4skR9EngcT7d+xUIy7JGUb30/pW2PZg8mhVlNi8\nslD3FBuECTMUiW0cMCjv0ApsqF73OQCcj4/9xJ+xSFHhGtNVpWEzWzhi+9bdo67/\n41TNXYWtAgMBAAECggEAG0fBC7Z6CjVlKu2QsqriJyEhg1+t1r++C/RkrrC3445T\n/YZTDgjZO2/DI5qwQa8f4xpb8YJ76vMhs5LgcVQlreuZLT+KLe7tgAbEQ5lcpzao\n+ArYKz6B19eVhUksaoDmSi8fFpaY8LNN0qAauhVvzFLnouqnL6jgNkayOdNwBUD3\n0ssP5bc1lGGIi5iYxoFOZvQYckjeX0kVnnuHLQXWEnAxqJ9QzNWE2R0Am1CZz8uC\nol/dIxRQM9XBBznMryCUmHmSzaBXsNajqfuMLncJZCJi1p5Z9FiAtBCdiGl6UwAy\nz0pmGrAup8SKq1F+fwK0mt8cuyv45JTw/in0ebtmbwKBgQDxxZNFwQ1WpCmjdXqO\nuCbrbLwYDe0ZCjjQ9o3n34PHjgyzdyqx7v7LrMxpGSLS5UMx0q9bk3dJKVwfCyxv\n+tM8+Ekkazdg6I3flgJmelmRD4O1PccBfQLAyWZfyFk8fOc4J1RcLzxInrfBirMm\nDSqSiXqnVksQxSr0d4X9yfJPDwKBgQDBlVekLgQCgmDelfAJF7ULDW/WDtzj8YS/\n4DNe0pKHDb9lIDUIFdv1ctla8xjTh+TRXpLEo2/STADKyhAuvloNtn+S38j/86Ba\n42LvWgYdzYdJFMiTH62VDosHKuhsTzDBbwsckSsAeOlbcsX+IlHiLoQV3Y5PA61s\nVx3CJG/fgwKBgQCIuoqyLR5k/EwMBBk+c0iXZZPuKpoGyjAdhQH1uwMkrOHj8KW1\noQp5lwy29x8pk7xvhc3kBT61om1VpRUJcxlZZrS+ot/br0jkxEoxOEpE7jg3HGva\nHJ+c9Yku6/gDbEO7Dwr3Y0M9cn1LOCxefZ2w54z066liH49OV/Xv8/BT4wKBgH7g\nrSKUblher7LzvvGWsjheRDCeaTSVNZa1EbZSeWs/HXTgWSHFgfcroT41Gs55wQVg\n4P00ybOh0NsY+OZKKKfYN2FCf3EScsVfR5btABlEfijuEFAtcQ3DDGhUPSXP+Xqu\nly/QDckvdnNTlGVuhRCjwDq8jetH08CwkHaQfyqVAoGADSHMcz0Oy7CYPpI7t+NR\n4jIfpmIAf5Rl9BIpHyutSrAeATXrvlixCBo+uC8E++DgiWlIo9Sn6xJGp+njN4C6\nubzZCFGbo1WSHESXX3BXp8PHQ83+redDVMIU0H0ASraPNCt8cHGvuDnKZwnnFcwd\n3mnKk+ejukTdQal5nsE1D9E=\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@chat-app-d94f3.iam.gserviceaccount.com",
  client_id: "109684351450679293281",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40chat-app-d94f3.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

// src/config/firebase.config.ts
var serviceAccount = {
  projectId: firebase_admin_cred_default.project_id,
  privateKey: firebase_admin_cred_default.private_key,
  clientEmail: firebase_admin_cred_default.client_email
};
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
var messaging = admin.messaging();

// src/constants/notification-title.contant.ts
var notificationTitles = [
  // "📩 You've got a new message! Ready for some chat-desi delight?",
  // "💬 Ding! Your chat order is up! Check your new message.",
  // "🗨️ Hot and fresh message just for you. Don't let it get cold!",
  // "📲 Chat's ready! Someone's waiting for your reply.",
  // "🎉 Chat like a boss! You’ve got a new message.",
  // "📬 Special delivery! New message served hot.",
  // "💌 Your chat buddy just sent you a message. Dive in!",
  // "📥 Message alert! Your chat session just got spicier.",
  // "📨 Guess what? A new message just arrived. Yum!",
  // "📧 Chat feast! There's a new message on the menu.",
  // "🗨️ New message alert! Fresh and crispy, just for you.",
  // "📲 Ready for a chat binge? You've got a new message.",
  // "💬 Hello there! You've got a piping hot message.",
  // "📩 Someone sent you a message. Time for some chat-tastic fun!",
  // "📥 Ding! A new message has just been delivered to your chat inbox.",
  // "🗨️ Fresh chat served! You've got a new message.",
  // "📬 Chat cravings? Your message is here.",
  // "💌 Inbox special! New message waiting for your reply.",
  // "🎉 Chat is calling! You've got a new message.",
  // "📧 It's chat o'clock! Check out your new message.",
  // "📲 Ready for some chat goodness? You've got a new message.",
  // "🗨️ Your chat platter is ready! Fresh message just for you.",
  // "💬 Chat feast alert! New message on your screen.",
  // "📩 Yum! Fresh message delivered to your inbox.",
  // "📥 Chat special! New message ready for your reply.",
  // "🎉 Get ready to chat! New message just arrived.",
  // "📨 Hot and ready! You've got a new message.",
  // "💬 Chat bonanza! New message just for you.",
  // "📧 Inbox delight! Your new message is here.",
  // "📲 A new message is ready to chat with you!",
  // "🗨️ Time for some chat fun! You've got a new message.",
  // "💌 Chat cravings? Your new message has arrived.",
  // "📩 Ready for some chat magic? New message is here.",
  // "📥 Inbox refresh! You've got a new message.",
  // "📨 Surprise! A new message is waiting for you.",
  // "🎉 Chat time! You've got a fresh message.",
  // "📬 Message alert! Someone's waiting for your reply.",
  // "💬 Your chat buddy just dropped you a message. Check it out!",
  // "🗨️ Inbox special! New message served hot and fresh.",
  // "📲 Chat delight! You've got a new message.",
  // "📧 Ready for some chat fun? New message is here.",
  // "💌 Chat cravings satisfied! New message just arrived.",
  // "📩 Inbox treat! You've got a new message.",
  // "📥 Your chat is ready! New message waiting for you.",
  // "🎉 Chat celebration! You've got a new message.",
  // "📨 Fresh and tasty message delivered to your inbox.",
  // "🤖 System hang ek message se! Check it out! 🖥️",
  "Sarkari naukari chaidiya? Miljugii! Message dhek lo. \u{1F4E9}\u{1F4DD}",
  "\u{1F48C} Vo toh bhav nahi de rahi, message hi dekh lo phir. \u{1F4E9}",
  "\u{1F697} Navi gaadi chaidiya? Miljugii! Check your message now. \u{1F699}",
  "\u{1F620} Momos? Yeh kya hove?? Daal roti na kahi jaa rahi",
  "\u2615 Dolly ki chai pilo or baatchit chalao",
  "\u{1F3DE} Hello pans, mein Kashmir mein hun or baatchit chala raha hun",
  "\u{1F31F} Punnet superstar is calling you",
  "\u{1F628} Thappad se dar nahi lagta sahab, message se lagta hai. \u{1F4E9}",
  "\u{1F60C} All is well! Naya message aa gaya hai. \u{1F48C}",
  "\u{1F9C2} Kya aapke toothpaste mein namak hai? Aapke inbox mein message hai? \u{1F4E9}",
  "\u{1F496} Pyar dosti hai, aur message bhi! \u{1F4AC}",
  "\u{1F48A} Mujhe drugs mat do, mujhe message do! \u{1F4E8}",
  "\u{1F697} Aaj mere paas gaadi hai, bangla hai, message hai. \u{1F4E9}\u{1F4BC}",
  "\u{1F622} Pushpa, I hate tears! Chat karne se sab theek ho jayega. \u{1F4AC}",
  "\u{1F680} Chak de phatte! Message aa gaya! \u{1F4E9}",
  "\u{1F31E} Garmi itni ho rahi hai, message hi dhek lo! \u{1F525}",
  "Basanti, \u{1F415} in kutto ke samne chat mat karna!",
  "Subah utho\u{1F60E}, instagram chalao\u{1F933}\u{1F3FB}, maar khao \u{1F590}\u{1F3FB}, sojao \u{1F634}",
  "Traffic mein phas gaye? Chat karke time pass karo! \u{1F697}\u{1F4F2}",
  "Life update\u{1F60A}: pagal ho chuka hun\u{1F480}",
  "Dhek dhek dhek \u{1F575}\uFE0F\u200D\u2642\uFE0F kaise khush hora \u{1F603}",
  "Karu guddi laal? \u{1F624}",
  "Beimaan hain bada mausam, lekin baatchit nahi\u{1F975}",
  "Bhai meme banane se pet nahi bharta! \u{1F3AC}\u{1F354}",
  "Kya purav jha ai hain ?? \u{1F914}",
  "Asambhavvvv!!\u{1FAE8}\u{1F632}\u{1F92F} Naye message aaya hai! \u{1F4E9}\u{1F389}"
];

// src/utils/generic.ts
var calculateSkip = (page, limit) => {
  return Math.ceil((page - 1) * limit);
};
var getRandomIndex = (length) => {
  return Math.floor(Math.random() * length);
};
var sendPushNotification = ({ fcmToken, body, title }) => {
  try {
    console.log("push notification called for fcmToken", fcmToken);
    const link = "/";
    const payload = {
      token: fcmToken,
      notification: {
        title: title ? title : `${notificationTitles[getRandomIndex(notificationTitles.length)]}`,
        body,
        imageUrl: "https://res.cloudinary.com/djr9vabwz/image/upload/v1739560136/logo192_lqsucz.png"
      },
      webpush: link && {
        fcmOptions: {
          link
        }
      }
    };
    messaging.send(payload);
  } catch (error) {
    console.log("error while sending push notification", error);
  }
};
var convertBufferToBase64 = (buffer) => {
  return Buffer.from(buffer).toString("base64");
};

// src/utils/auth.util.ts
var thirtyDaysInMilliseconds = 30 * 24 * 60 * 60 * 1e3;
var uploadFilesToCloudinary = async ({ files }) => {
  try {
    const uploadPromises = files.map((file) => cloudinary2.uploader.upload(file.path));
    const result = await Promise.all(uploadPromises);
    return result;
  } catch (error) {
    console.log("Error uploading files to cloudinary");
    console.log(error);
  }
};
var deleteFilesFromCloudinary = async ({ publicIds }) => {
  try {
    await cloudinary2.uploader.destroy(publicIds[0]);
    const deletePromises = publicIds.map((publicId) => cloudinary2.uploader.destroy(publicId));
    const uploadResult = await Promise.all(deletePromises);
    return uploadResult;
  } catch (error) {
    console.log("Error deleting files from cloudinary");
    console.log(error);
  }
};
var uploadEncryptedAudioToCloudinary = async ({ buffer }) => {
  try {
    const base64Audio = `data:audio/webm;base64,${convertBufferToBase64(buffer)}`;
    const uploadResult = await cloudinary2.uploader.upload(base64Audio, {
      resource_type: "raw",
      // "raw" for non-standard formats (or "video" for MP4)
      folder: "encrypted-audio"
    });
    return uploadResult;
  } catch (error) {
    console.error("Error uploading encrypted audio to Cloudinary:", error);
  }
};
var uploadAudioToCloudinary = async ({ buffer }) => {
  try {
    const base64Audio = `data:audio/webm;base64,${convertBufferToBase64(buffer)}`;
    const uploadResult = await cloudinary2.uploader.upload(base64Audio, {
      resource_type: "raw",
      // "raw" for non-standard formats (or "video" for MP4)
      folder: "group-audio"
    });
    return uploadResult;
  } catch (error) {
    console.error("Error uploading audio to Cloudinary:", error);
  }
};

// src/utils/socket.util.ts
var emitEvent = ({ data, event, io: io2, users }) => {
  const sockets = getMemberSockets(users);
  if (sockets) {
    io2.to(sockets).emit(event, data);
  }
};
var emitEventToRoom = ({ data, event, io: io2, room }) => {
  io2.to(room).emit(event, data);
};
var getMemberSockets = (members) => {
  return members.map((member) => userSocketIds.get(member));
};

// src/controllers/attachment.controller.ts
var uploadAttachment = asyncErrorHandler(async (req, res, next) => {
  if (!req.files?.length) {
    return next(new CustomError("Please provide the files", 400));
  }
  const { chatId } = req.body;
  if (!chatId) {
    return next(new CustomError("ChatId is required", 400));
  }
  const isExistingChat = await prisma.chat.findUnique({
    where: {
      id: chatId
    },
    include: {
      ChatMembers: {
        select: {
          userId: true
        }
      }
    }
  });
  if (!isExistingChat) {
    return next(new CustomError("Chat not found", 404));
  }
  const attachments = req.files;
  const invalidFiles = attachments.filter((file) => !ACCEPTED_FILE_MIME_TYPES.includes(file.mimetype));
  if (invalidFiles.length) {
    const invalidFileNames = invalidFiles.map((file) => file.originalname).join(", ");
    return next(new CustomError(`Unsupported file types: ${invalidFileNames}, please provide valid files`, 400));
  }
  const uploadResults = await uploadFilesToCloudinary({ files: attachments });
  console.log("Cloudinary Upload Results:", uploadResults);
  if (!uploadResults) {
    return next(new CustomError("Failed to upload files", 500));
  }
  const attachmentsArray = uploadResults.map(({ secure_url, public_id }) => ({ cloudinaryPublicId: public_id, secureUrl: secure_url }));
  const newMessage = await prisma.message.create({
    data: {
      chatId,
      senderId: req.user.id,
      attachments: {
        createMany: {
          data: attachmentsArray.map((attachment) => ({ cloudinaryPublicId: attachment.cloudinaryPublicId, secureUrl: attachment.secureUrl }))
        }
      }
    },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          avatar: true
        }
      },
      attachments: {
        select: {
          secureUrl: true
        }
      },
      poll: {
        omit: {
          id: true
        }
      },
      reactions: {
        select: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true
            }
          },
          reaction: true
        }
      }
    },
    omit: {
      senderId: true,
      pollId: true,
      audioPublicId: true
    }
  });
  const io2 = req.app.get("io");
  emitEventToRoom({ data: newMessage, event: "MESSAGE" /* MESSAGE */, io: io2, room: chatId });
  const otherMembersOfChat = isExistingChat.ChatMembers.filter(({ userId }) => req.user.id !== userId);
  const updateOrCreateUnreadMessagePromises = otherMembersOfChat.map(({ userId }) => {
    return prisma.unreadMessages.upsert({
      where: {
        userId_chatId: { userId, chatId }
        // Using the unique composite key
      },
      update: {
        count: { increment: 1 },
        senderId: req.user.id
      },
      create: {
        userId,
        chatId,
        count: 1,
        senderId: req.user.id,
        messageId: newMessage.id
      }
    });
  });
  await Promise.all(updateOrCreateUnreadMessagePromises);
  const unreadMessageData = {
    chatId,
    message: {
      attachments: newMessage.attachments.length ? true : false,
      createdAt: newMessage.createdAt
    },
    sender: {
      id: newMessage.sender.id,
      avatar: newMessage.sender.avatar,
      username: newMessage.sender.avatar
    }
  };
  emitEventToRoom({ data: unreadMessageData, event: "UNREAD_MESSAGE" /* UNREAD_MESSAGE */, io: io2, room: chatId });
  return res.status(201).json({});
});
var fetchAttachments = asyncErrorHandler(async (req, res, next) => {
  const { id } = req.params;
  const { page = 1, limit = 6 } = req.query;
  const attachments = await prisma.attachment.findMany({
    where: {
      message: {
        chatId: id
      }
    },
    omit: {
      id: true,
      cloudinaryPublicId: true,
      messageId: true
    },
    orderBy: {
      message: {
        createdAt: "desc"
      }
    },
    skip: calculateSkip(Number(page), Number(limit)),
    take: Number(limit)
  });
  const totalAttachmentsCount = await prisma.attachment.count({ where: { message: { chatId: id } } });
  const totalPages = Math.ceil(totalAttachmentsCount / Number(limit));
  const payload = {
    attachments,
    totalAttachmentsCount,
    totalPages
  };
  res.status(200).json(payload);
});

// src/middlewares/multer.middleware.ts
import multer from "multer";
import { v4 as uuidV4 } from "uuid";
var upload = multer({
  limits: { fileSize: MAX_FILE_SIZE },
  storage: multer.diskStorage({
    filename: (req, file, cb) => {
      const userId = req.user.id;
      const uniqueMiddleName = uuidV4();
      const newFileName = `${userId}-${uniqueMiddleName}-${file.originalname}`;
      cb(null, newFileName);
    }
  })
});

// src/middlewares/verify-token.middleware.ts
import jwt2 from "jsonwebtoken";
var verifyToken = asyncErrorHandler(async (req, res, next) => {
  let { token } = req.cookies;
  const secretKey = "helloWorld@123";
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }
  if (!token) {
    return next(new CustomError("Token missing, please login again", 401));
  }
  const decodedInfo = jwt2.verify(token, secretKey, { algorithms: ["HS256"] });
  if (!decodedInfo || !decodedInfo.userId) {
    return next(new CustomError("Invalid token please login again", 401));
  }
  const user = await prisma.user.findUnique({
    where: {
      id: decodedInfo.userId
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
      oAuthSignup: true
    }
  });
  if (!user) {
    return next(new CustomError("Invalid Token, please login again", 401));
  }
  req.user = user;
  next();
});

// src/routes/attachment.router.ts
var attachment_router_default = Router().post("/", verifyToken, upload.array("attachments[]", 5), uploadAttachment).get("/:id", verifyToken, fetchAttachments);

// src/routes/auth.router.ts
import { Router as Router2 } from "express";
import passport2 from "passport";

// src/controllers/auth.controller.ts
import jwt3 from "jsonwebtoken";
var getUserInfo = asyncErrorHandler(async (req, res, next) => {
  const user = req.user;
  const secureUserInfo = {
    id: user.id,
    name: user.name,
    username: user.username,
    avatar: user.avatar,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    emailVerified: user.emailVerified,
    publicKey: user.publicKey,
    notificationsEnabled: user.notificationsEnabled,
    verificationBadge: user.verificationBadge,
    fcmToken: user.fcmToken,
    oAuthSignup: user.oAuthSignup
  };
  return res.status(200).json(secureUserInfo);
});
var updateFcmToken = asyncErrorHandler(async (req, res, next) => {
  const { fcmToken } = req.body;
  const user = await prisma.user.update({
    where: {
      id: req.user.id
    },
    data: {
      fcmToken
    }
  });
  return res.status(200).json({ fcmToken: user.fcmToken });
});
var checkAuth = asyncErrorHandler(async (req, res, next) => {
  if (req.user) {
    const secureUserInfo = {
      id: req.user.id,
      name: req.user.name,
      username: req.user.username,
      avatar: req.user.avatar,
      email: req.user.email,
      createdAt: req.user.createdAt,
      updatedAt: req.user.updatedAt,
      emailVerified: req.user.emailVerified,
      publicKey: req.user.publicKey,
      notificationsEnabled: req.user.notificationsEnabled,
      verificationBadge: req.user.verificationBadge,
      fcmToken: req.user.fcmToken,
      oAuthSignup: req.user.oAuthSignup
    };
    return res.status(200).json(secureUserInfo);
  }
  return next(new CustomError("Token missing, please login again", 401));
});
var redirectHandler = asyncErrorHandler(async (req, res, next) => {
  try {
    if (req.user) {
      const tempToken = jwt3.sign({ user: req.user.id, oAuthNewUser: req.user.newUser }, env.JWT_SECRET, { expiresIn: "5m" });
      return res.redirect(307, `${config2.clientUrl}/auth/oauth-redirect?token=${tempToken}`);
    } else {
      return res.redirect(`${config2.clientUrl}/auth/login`);
    }
  } catch (error) {
    console.log("error duing oauth redirect handler");
    return res.redirect(`${config2.clientUrl}/auth/login`);
  }
});

// src/middlewares/validate.middleware.ts
var validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    next(error);
  }
};

// src/schemas/auth.schema.ts
import { z as z2 } from "zod";
var passwordValidation = z2.string({ required_error: "Password is required" }).min(8, "Password cannot be shorter than 8 characters").max(40, "Password cannot be longer than 30 characters").regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/gm, "Password must contain 8 characters, 1 uppercase letter, 1 lowercase letter and 1 number");
var fcmTokenSchema = z2.object({
  fcmToken: z2.string({ required_error: "fcm token is required" })
});

// src/routes/auth.router.ts
var auth_router_default = Router2().get("/user", verifyToken, getUserInfo).get("/verify-token", verifyToken, checkAuth).patch("/user/update-fcm-token", verifyToken, validate(fcmTokenSchema), updateFcmToken).get("/google", passport2.authenticate("google", { session: false, scope: ["email", "profile"] })).get("/google/callback", passport2.authenticate("google", { session: false, failureRedirect: `${config2.clientUrl}/auth/login` }), redirectHandler);

// src/routes/chat.router.ts
import { Router as Router3 } from "express";

// src/schemas/chat.schema.ts
import { z as z3 } from "zod";
var createChatSchema = z3.object({
  name: z3.string().optional(),
  isGroupChat: z3.enum(["true", "false"]),
  members: z3.string({ required_error: "members are required" }).array().min(1, "Atleast 1 member is required to create a chat").max(30, "Chat members cannot be more than 30"),
  avatar: z3.string().optional()
});
var addMemberToChatSchema = z3.object({
  members: z3.string({ required_error: "Atleast one member is required to add to chat" }).array()
});
var removeMemberfromChat = z3.object({
  members: z3.string({ required_error: "Atleast one member is required to remove from chat" }).array()
});
var updateChatSchema = z3.object({
  name: z3.string({ required_error: "chat name is required" }).optional()
});

// src/utils/chat.util.ts
var joinMembersInChatRoom = ({ memberIds, roomToJoin, io: io2 }) => {
  for (const memberId of memberIds) {
    const memberSocketId = userSocketIds.get(memberId);
    if (memberSocketId) {
      const memberSocket = io2.sockets.sockets.get(memberSocketId);
      if (memberSocket) {
        memberSocket.join(roomToJoin);
      }
    }
  }
};
var disconnectMembersFromChatRoom = ({ memberIds, roomToLeave, io: io2 }) => {
  for (const memberId of memberIds) {
    const memberSocketId = userSocketIds.get(memberId);
    if (memberSocketId) {
      const memberSocket = io2.sockets.sockets.get(memberSocketId);
      if (memberSocket) {
        memberSocket.leave(roomToLeave);
      }
    }
  }
};

// src/controllers/chat.controller.ts
var createChat = asyncErrorHandler(async (req, res, next) => {
  let uploadResults = [];
  const { isGroupChat, members, name } = req.body;
  if (isGroupChat === "true") {
    if (members.length < 2) {
      return next(new CustomError("Atleast 2 members are required to create group chat", 400));
    } else if (!name) {
      return next(new CustomError("name is required for creating group chat", 400));
    }
    const memberIds = [...members, req.user.id];
    let hasAvatar = false;
    if (req.file) {
      hasAvatar = true;
      uploadResults = await uploadFilesToCloudinary({ files: [req.file] });
    }
    const avatar = hasAvatar && uploadResults && uploadResults[0] ? uploadResults[0].secure_url : DEFAULT_AVATAR;
    const avatarCloudinaryPublicId = hasAvatar && uploadResults && uploadResults[0] ? uploadResults[0].public_id : null;
    const newChat = await prisma.chat.create({
      data: {
        avatar,
        avatarCloudinaryPublicId,
        isGroupChat: true,
        adminId: req.user.id,
        name
      },
      select: {
        id: true
      }
    });
    await prisma.chatMembers.createMany({
      data: memberIds.map((id) => ({
        chatId: newChat.id,
        userId: id
      }))
    });
    const populatedChat = await prisma.chat.findUnique({
      where: { id: newChat.id },
      omit: {
        avatarCloudinaryPublicId: true
      },
      include: {
        ChatMembers: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                isOnline: true,
                publicKey: true,
                lastSeen: true,
                verificationBadge: true
              }
            }
          },
          omit: {
            chatId: true,
            userId: true,
            id: true
          }
        },
        UnreadMessages: {
          where: {
            userId: req.user.id
          },
          select: {
            count: true,
            message: {
              select: {
                isTextMessage: true,
                url: true,
                attachments: {
                  select: {
                    secureUrl: true
                  }
                },
                isPollMessage: true,
                createdAt: true,
                textMessageContent: true
              }
            },
            sender: {
              select: {
                id: true,
                username: true,
                avatar: true,
                isOnline: true,
                publicKey: true,
                lastSeen: true,
                verificationBadge: true
              }
            }
          }
        },
        latestMessage: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                avatar: true
              }
            },
            attachments: {
              select: {
                secureUrl: true
              }
            },
            poll: true,
            reactions: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    avatar: true
                  }
                }
              },
              omit: {
                id: true,
                createdAt: true,
                updatedAt: true,
                userId: true,
                messageId: true
              }
            }
          }
        }
      }
    });
    const io2 = req.app.get("io");
    joinMembersInChatRoom({ memberIds, roomToJoin: newChat.id, io: io2 });
    emitEventToRoom({ event: "NEW_CHAT" /* NEW_CHAT */, io: io2, room: newChat.id, data: { ...populatedChat, typingUsers: [] } });
    return res.status(201);
  }
});
var getUserChats = asyncErrorHandler(async (req, res, next) => {
  const chats = await prisma.chat.findMany({
    where: {
      ChatMembers: {
        some: {
          userId: req.user.id
        }
      }
    },
    omit: {
      avatarCloudinaryPublicId: true
    },
    include: {
      ChatMembers: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              isOnline: true,
              publicKey: true,
              lastSeen: true,
              verificationBadge: true
            }
          }
        },
        omit: {
          chatId: true,
          userId: true,
          id: true
        }
      },
      UnreadMessages: {
        select: {
          count: true,
          message: {
            select: {
              isTextMessage: true,
              url: true,
              attachments: {
                select: {
                  secureUrl: true
                }
              },
              isPollMessage: true,
              createdAt: true,
              textMessageContent: true
            }
          },
          sender: {
            select: {
              id: true,
              username: true,
              avatar: true,
              isOnline: true,
              publicKey: true,
              lastSeen: true,
              verificationBadge: true
            }
          }
        }
      },
      latestMessage: {
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              avatar: true
            }
          },
          attachments: {
            select: {
              secureUrl: true
            }
          },
          poll: true,
          reactions: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatar: true
                }
              }
            },
            omit: {
              id: true,
              createdAt: true,
              updatedAt: true,
              userId: true,
              messageId: true
            }
          }
        }
      }
    }
  });
  const chatsWithUserTyping = chats.map((chat) => ({
    ...chat,
    typingUsers: []
  }));
  return res.status(200).json(chatsWithUserTyping);
});
var addMemberToChat = asyncErrorHandler(async (req, res, next) => {
  const { id } = req.params;
  const { members } = req.body;
  const chat = await prisma.chat.findUnique({ where: { id } });
  if (!chat) {
    return next(new CustomError("Chat does not exists", 404));
  }
  if (!chat.isGroupChat) {
    return next(new CustomError("This is not a group chat, you cannot add members", 400));
  }
  const isAdminAddingMember = chat.adminId === req.user.id;
  if (!isAdminAddingMember) {
    return next(new CustomError("You are not allowed to add members as you are not the admin of this chat", 400));
  }
  const areMembersToBeAddedAlreadyExists = await prisma.chatMembers.findMany({
    where: {
      chatId: id,
      userId: {
        in: members
      }
    },
    include: {
      user: {
        select: {
          username: true
        }
      }
    }
  });
  if (areMembersToBeAddedAlreadyExists.length) {
    return next(new CustomError(`${areMembersToBeAddedAlreadyExists.map(({ user: { username } }) => `${username}`)} already exists in members of this chat`, 400));
  }
  const oldExistingMembers = await prisma.chatMembers.findMany({
    where: {
      chatId: id
    },
    include: {
      user: {
        select: {
          id: true
        }
      }
    }
  });
  const oldExistingMembersIds = oldExistingMembers.map(({ user: { id: id2 } }) => id2);
  await prisma.chatMembers.createMany({
    data: members.map((memberid) => ({
      chatId: id,
      userId: memberid
    }))
  });
  const newMemberDetails = await prisma.user.findMany({
    where: {
      id: {
        in: members
      }
    },
    select: {
      id: true,
      username: true,
      avatar: true,
      isOnline: true,
      publicKey: true,
      lastSeen: true,
      verificationBadge: true
    }
  });
  const updatedChat = await prisma.chat.findUnique({
    where: {
      id: chat.id
    },
    omit: {
      avatarCloudinaryPublicId: true
    },
    include: {
      ChatMembers: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              isOnline: true,
              publicKey: true,
              lastSeen: true,
              verificationBadge: true
            }
          }
        },
        omit: {
          chatId: true,
          userId: true,
          id: true
        }
      },
      latestMessage: {
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              avatar: true
            }
          },
          attachments: {
            select: {
              secureUrl: true
            }
          },
          poll: true,
          reactions: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatar: true
                }
              }
            },
            omit: {
              id: true,
              createdAt: true,
              updatedAt: true,
              userId: true,
              messageId: true
            }
          }
        }
      }
    }
  });
  const io2 = req.app.get("io");
  joinMembersInChatRoom({ io: io2, roomToJoin: chat.id, memberIds: members });
  emitEvent({ event: "NEW_CHAT" /* NEW_CHAT */, data: { ...updatedChat, typingUsers: [], UnreadMessages: [] }, io: io2, users: members });
  const payload = {
    chatId: chat.id,
    members: newMemberDetails
  };
  emitEvent({ data: payload, event: "NEW_MEMBER_ADDED" /* NEW_MEMBER_ADDED */, io: io2, users: oldExistingMembersIds });
  return res.status(200);
});
var removeMemberFromChat = asyncErrorHandler(async (req, res, next) => {
  const { id } = req.params;
  const { members } = req.body;
  const chat = await prisma.chat.findUnique({ where: { id } });
  if (!chat) {
    return next(new CustomError("Chat does not exists", 404));
  }
  if (!chat.isGroupChat) {
    return next(new CustomError("This is not a group chat, you cannot remove members", 400));
  }
  const isAdminRemovingMembers = req.user.id === chat.adminId;
  if (!isAdminRemovingMembers) {
    return next(new CustomError("You are not allowed to remove members as you are not the admin of this chat", 400));
  }
  const existingMembers = await prisma.chatMembers.findMany({
    where: {
      chatId: id
    }
  });
  if (existingMembers.length === 3) {
    return next(new CustomError("Minimum 3 members are required in a group chat", 400));
  }
  const existingMemberIds = existingMembers.map(({ userId }) => userId);
  const doesMembersToBeRemovedDosentExistsAlready = members.filter((memberId) => !existingMemberIds.includes(memberId));
  if (doesMembersToBeRemovedDosentExistsAlready.length) {
    return next(new CustomError("Provided members to be removed dosen't exists in chat", 404));
  }
  let adminLeavingId = null;
  for (const member of members) {
    if (member === chat.adminId) {
      adminLeavingId = member;
      break;
    }
  }
  if (adminLeavingId) {
    let nextAdminId = null;
    for (const memberId of existingMemberIds) {
      if (memberId !== adminLeavingId && !members.includes(memberId)) {
        nextAdminId = memberId;
        break;
      }
    }
    if (nextAdminId) {
      await prisma.chat.update({
        where: { id },
        data: { adminId: nextAdminId }
      });
    }
  }
  await prisma.chatMembers.deleteMany({
    where: {
      chatId: id,
      userId: { in: members }
    }
  });
  const io2 = req.app.get("io");
  disconnectMembersFromChatRoom({ io: io2, memberIds: members, roomToLeave: id });
  const deletedChatPayload = {
    chatId: id
  };
  emitEvent({ io: io2, event: "DELETE_CHAT" /* DELETE_CHAT */, users: members, data: deletedChatPayload });
  const remainingMembers = existingMemberIds.filter((id2) => !members.includes(id2));
  const payload = {
    chatId: id,
    membersId: members
  };
  emitEvent({ io: io2, event: "MEMBER_REMOVED" /* MEMBER_REMOVED */, data: payload, users: remainingMembers });
  return res.status(200);
});
var updateChat = asyncErrorHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name } = req.body;
  const avatar = req.file;
  if (!name && !avatar) {
    return next(new CustomError("Either avatar or name is required for updating a chat, please provide one"));
  }
  const chat = await prisma.chat.findUnique({
    where: { id }
  });
  if (!chat) {
    return next(new CustomError("chat not found", 404));
  }
  if (!chat.isGroupChat) {
    return next(new CustomError("You cannot update a private chat", 400));
  }
  if (avatar) {
    if (chat.avatarCloudinaryPublicId) {
      await deleteFilesFromCloudinary({ publicIds: [chat.avatarCloudinaryPublicId] });
    }
    const uploadResult = await uploadFilesToCloudinary({ files: [avatar] });
    if (!uploadResult) {
      return next(new CustomError("Error updating chat avatar", 404));
    }
    await prisma.chat.update({
      where: { id },
      data: {
        avatarCloudinaryPublicId: uploadResult[0].public_id,
        avatar: uploadResult[0].secure_url
      }
    });
  }
  if (name) {
    await prisma.chat.update({
      where: { id },
      data: { name }
    });
  }
  const updatedChat = await prisma.chat.findUnique({
    where: { id },
    select: { name: true, avatar: true, id: true }
  });
  if (!updatedChat) {
    return next(new CustomError("Error updating chat", 404));
  }
  const payload = {
    chatId: updatedChat.id,
    chatAvatar: updatedChat.avatar,
    chatName: updatedChat.name
  };
  const io2 = req.app.get("io");
  emitEventToRoom({ io: io2, event: "GROUP_CHAT_UPDATE" /* GROUP_CHAT_UPDATE */, room: id, data: payload });
  return res.status(200);
});

// src/middlewares/file-validation.middleware.ts
var fileValidation = (req, res, next) => {
  if (req.file) {
    if (!ACCEPTED_IMAGE_TYPES.includes(req.file.mimetype)) {
      return next(new CustomError(`Only ${ACCEPTED_IMAGE_TYPES.join(" ")} file types are supported and you are trying to upload a file with ${req.file.mimetype} type`, 400));
    }
    if (req.file.size > MAX_FILE_SIZE) {
      return next(new CustomError(`Avatar must not be larger than ${MAX_FILE_SIZE / 1e6}MB`, 400));
    }
    return next();
  }
  return next();
};

// src/routes/chat.router.ts
var chat_router_default = Router3().post("/", verifyToken, upload.single("avatar"), fileValidation, validate(createChatSchema), createChat).get("/", verifyToken, getUserChats).patch("/:id/members", verifyToken, validate(addMemberToChatSchema), addMemberToChat).patch("/:id", verifyToken, upload.single("avatar"), fileValidation, validate(updateChatSchema), updateChat).delete("/:id/members", verifyToken, validate(removeMemberfromChat), removeMemberFromChat);

// src/routes/message.router.ts
import { Router as Router4 } from "express";

// src/controllers/message.controller.ts
var getMessages = asyncErrorHandler(async (req, res, next) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const pageNumber = Number(page);
  const limitNumber = Number(limit);
  const messages = await prisma.message.findMany({
    where: {
      chatId: id
    },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          avatar: true
        }
      },
      attachments: {
        select: {
          secureUrl: true
        }
      },
      poll: {
        omit: {
          id: true
        },
        include: {
          votes: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatar: true
                }
              }
            },
            omit: {
              id: true,
              pollId: true,
              userId: true
            }
          }
        }
      },
      reactions: {
        select: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true
            }
          },
          reaction: true
        }
      },
      replyToMessage: {
        select: {
          sender: {
            select: {
              id: true,
              username: true,
              avatar: true
            }
          },
          id: true,
          textMessageContent: true,
          isPollMessage: true,
          url: true,
          audioUrl: true,
          attachments: {
            select: {
              secureUrl: true
            }
          }
        }
      }
    },
    omit: {
      senderId: true,
      pollId: true
    },
    orderBy: {
      createdAt: "desc"
    },
    skip: calculateSkip(pageNumber, limitNumber),
    take: limitNumber
  });
  const totalMessagesCount = await prisma.message.count({
    where: {
      chatId: id
    }
  });
  const totalPages = Math.ceil(totalMessagesCount / limitNumber);
  const messagesWithTotalPage = {
    messages: messages.reverse(),
    totalPages
  };
  return res.status(200).json(messagesWithTotalPage);
});

// src/routes/message.router.ts
var message_router_default = Router4().get("/:id", verifyToken, getMessages);

// src/routes/request.router.ts
import { Router as Router5 } from "express";

// src/controllers/request.controller.ts
var getUserRequests = asyncErrorHandler(async (req, res, next) => {
  const friendRequests = await prisma.friendRequest.findMany({
    where: {
      receiverId: req.user.id
    },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          avatar: true,
          isOnline: true,
          publicKey: true,
          lastSeen: true,
          verificationBadge: true
        }
      }
    },
    omit: {
      receiverId: true,
      updatedAt: true
    }
  });
  return res.status(200).json(friendRequests);
});
var createRequest = asyncErrorHandler(async (req, res, next) => {
  const { receiver } = req.body;
  const isValidReceiverId = await prisma.user.findUnique({ where: { id: receiver } });
  if (!isValidReceiverId) {
    return next(new CustomError("Receiver not found", 404));
  }
  if (req.user.id === receiver) {
    return next(new CustomError("You cannot send a request to yourself", 400));
  }
  const requestAlreadyExists = await prisma.friendRequest.findFirst({
    where: {
      AND: [
        {
          receiverId: receiver
        },
        {
          senderId: req.user.id
        }
      ]
    }
  });
  if (requestAlreadyExists) {
    return next(new CustomError("Request is already sent, please wait for them to either accept or reject it", 400));
  }
  const doesRequestExistsFromReceiver = await prisma.friendRequest.findFirst({
    where: {
      AND: [
        {
          senderId: receiver
        },
        {
          receiverId: req.user.id
        }
      ]
    }
  });
  if (doesRequestExistsFromReceiver) {
    return next(new CustomError("They have already sent you a friend request", 400));
  }
  const areAlreadyFriends = await prisma.friends.findFirst({
    where: {
      OR: [
        {
          user1Id: req.user.id,
          user2Id: receiver
        },
        {
          user1Id: receiver,
          user2Id: req.user.id
        }
      ]
    }
  });
  if (areAlreadyFriends) {
    return next(new CustomError("You are already friends", 400));
  }
  const newRequest = await prisma.friendRequest.create({
    data: {
      senderId: req.user.id,
      receiverId: receiver
    },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          avatar: true,
          isOnline: true,
          publicKey: true,
          lastSeen: true,
          verificationBadge: true
        }
      }
    },
    omit: {
      receiverId: true,
      updatedAt: true,
      senderId: true
    }
  });
  if (isValidReceiverId.fcmToken && isValidReceiverId.notificationsEnabled) {
    console.log("push notification triggered for receiver");
    sendPushNotification({ fcmToken: isValidReceiverId.fcmToken, body: `${req.user.username} sent you a friend request \u{1F603}` });
  }
  const io2 = req.app.get("io");
  emitEvent({ io: io2, event: "NEW_FRIEND_REQUEST" /* NEW_FRIEND_REQUEST */, data: newRequest, users: [receiver] });
  return res.status(201).json({});
});
var handleRequest = asyncErrorHandler(async (req, res, next) => {
  const { id } = req.params;
  const { action } = req.body;
  const isExistingRequest = await prisma.friendRequest.findFirst({
    where: {
      id
    }
  });
  if (!isExistingRequest) {
    return next(new CustomError("Request not found", 404));
  }
  if (isExistingRequest.receiverId !== req.user.id) {
    return next(new CustomError("Only the receiver of this request can accept or reject it", 401));
  }
  if (action === "accept") {
    const existingChat = await prisma.chat.findFirst({
      where: {
        isGroupChat: false,
        // Ensure it's a private chat
        ChatMembers: {
          every: {
            // Ensure both users are part of the chat
            userId: { in: [isExistingRequest.senderId, isExistingRequest.receiverId] }
          }
        }
      }
    });
    if (existingChat) {
      return next(new CustomError("Your private chat already exists", 400));
    }
    const newChat = await prisma.chat.create({
      data: {
        ChatMembers: {
          create: [
            { user: { connect: { id: isExistingRequest.senderId } } },
            { user: { connect: { id: isExistingRequest.receiverId } } }
          ]
        }
      },
      omit: {
        avatarCloudinaryPublicId: true
      },
      include: {
        ChatMembers: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                isOnline: true,
                publicKey: true,
                lastSeen: true,
                verificationBadge: true
              }
            }
          },
          omit: {
            chatId: true,
            userId: true,
            id: true
          }
        },
        UnreadMessages: {
          where: {
            userId: req.user.id
          },
          select: {
            count: true,
            message: {
              select: {
                isTextMessage: true,
                url: true,
                attachments: {
                  select: {
                    secureUrl: true
                  }
                },
                isPollMessage: true,
                createdAt: true,
                textMessageContent: true
              }
            },
            sender: {
              select: {
                id: true,
                username: true,
                avatar: true,
                isOnline: true,
                publicKey: true,
                lastSeen: true,
                verificationBadge: true
              }
            }
          }
        },
        latestMessage: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                avatar: true
              }
            },
            attachments: {
              select: {
                secureUrl: true
              }
            },
            poll: true,
            reactions: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    avatar: true
                  }
                }
              },
              omit: {
                id: true,
                createdAt: true,
                updatedAt: true,
                userId: true,
                messageId: true
              }
            }
          }
        }
      }
    });
    const newFriendEntry = await prisma.friends.create({
      data: {
        user1: {
          connect: {
            id: isExistingRequest.senderId
          }
        },
        user2: {
          connect: {
            id: isExistingRequest.receiverId
          }
        }
      },
      include: {
        user1: true,
        user2: true
      }
    });
    let sender = newFriendEntry.user1;
    if (sender.id != isExistingRequest.senderId) {
      sender = newFriendEntry.user2;
    }
    if (sender.notificationsEnabled && sender.fcmToken) {
      sendPushNotification({ fcmToken: sender.fcmToken, body: `${req.user.username} has accepted your friend request \u{1F603}` });
    }
    const io2 = req.app.get("io");
    joinMembersInChatRoom({ io: io2, memberIds: [isExistingRequest.senderId, isExistingRequest.receiverId], roomToJoin: newChat.id });
    await prisma.friendRequest.delete({
      where: {
        id
      }
    });
    emitEventToRoom({ data: { ...newChat, typingUsers: [] }, event: "NEW_CHAT" /* NEW_CHAT */, io: io2, room: newChat.id });
    return res.status(200).json({ id: isExistingRequest.id });
  } else if (action === "reject") {
    const deletedRequest = await prisma.friendRequest.delete({
      where: {
        id
      },
      include: {
        sender: {
          select: {
            isOnline: true,
            fcmToken: true,
            notificationsEnabled: true
          }
        }
      }
    });
    const sender = deletedRequest.sender;
    if (sender.fcmToken && sender.notificationsEnabled) {
      sendPushNotification({ fcmToken: sender.fcmToken, body: `${req.user.username} has rejected your friend request \u2639\uFE0F` });
    }
    return res.status(200).json({ id: deletedRequest.id });
  }
});

// src/schemas/request.schema.ts
import { z as z4 } from "zod";
var createRequestSchema = z4.object({
  receiver: z4.string({ required_error: "Receiver is required to send a request" })
});
var handleRequestSchema = z4.object({
  action: z4.enum(["accept", "reject"], { required_error: "action is required" })
});

// src/routes/request.router.ts
var request_router_default = Router5().get("/", verifyToken, getUserRequests).post("/", verifyToken, validate(createRequestSchema), createRequest).delete("/:id", verifyToken, validate(handleRequestSchema), handleRequest);

// src/routes/user.router.ts
import { Router as Router6 } from "express";

// src/config/nodemailer.config.ts
import nodemailer from "nodemailer";
var transporter;
try {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: env.EMAIL,
      pass: env.PASSWORD
    }
  });
} catch (error) {
  console.log(error);
}

// src/constants/emails/email.layout.ts
var emailLayout = (content, emailType) => {
  let headerTitle;
  switch (emailType) {
    case "welcome":
      headerTitle = "Welcome to Baatchit!";
      break;
    case "resetPassword":
      headerTitle = "Reset Your Baatchit Password";
      break;
    case "privateKeyRecovery":
      headerTitle = "Verify Private Key Recovery";
      break;
    case "OTP":
      headerTitle = "Verify Your Baatchit Account";
      break;
    default:
      headerTitle = "Baatchit";
  }
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }
            .container {
                background-color: #ffffff;
                max-width: 600px;
                margin: 20px auto;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                line-height: 1.6;
            }
            .header {
                text-align: center;
                border-bottom: 1px solid #dddddd;
                padding-bottom: 10px;
                display: flex;
                align-items: center;
                column-gap: 1rem;
            }
            .header h1 {
                color: #333333;
                font-size: 24px;
                margin: 0;
            }
            .content {
                padding: 20px;
            }
            .content p {
                color: #555555;
            }
            button {
                display: inline-block;
                padding: 10px 20px;
                font-size: 16px;
                background-color: #007bff;
                color: #ffffff;
                text-align: center;
                text-decoration: none;
                border-radius: 5px;
                margin-top: 20px;
                cursor:pointer
            }
            .footer {
                text-align: center;
                color: #777777;
                font-size: 12px;
                padding-top: 10px;
                border-top: 1px solid #dddddd;
                margin-top: 30px;
            }
            .otp {
                display: inline-block;
                background-color: #f7f7f7;
                padding: 10px 20px;
                font-size: 24px;
                letter-spacing: 5px;
                border-radius: 5px;
                margin: 20px 0;
            }
            a{
                color:#007bff
            }

            img {
            border-radius: 100%;
            width: 50px;
            height: 50px;
            }
        </style>
    </head>

    <body>
    <div class="container">

        <div class="header">
            <img src="https://res.cloudinary.com/dh5fjdce9/image/upload/v1718195665/logo256_nhwcrt.png" alt="Baatchit Logo" />
            <h1>${headerTitle}</h1>
        </div>

        <div class="content">
            ${content}
        </div>

        <div class="footer">
            <p>&copy; 2024 Baatchit. All rights reserved.</p>
        </div>

    </div>
    </body>
    </html>
    `;
};

// src/constants/emails/email.body.ts
var welcomeEmailBody = (username) => {
  return emailLayout(
    `
    <p>Hello ${username},</p>
    <p>Welcome to Baatchit! We're excited to have you on board. Our application offers a range of features designed to enhance your communication experience:</p>
    <ul>
        <li>End-to-End Encryption</li>
        <li>Private Key Recovery</li>
        <li>Push Notifications</li>
        <li>Real-time Messaging</li>
        <li>Friends Feature</li>
        <li>Group Chats</li>
        <li>User Presence</li>
        <li>Typing Indicators</li>
        <li>Message Seen Status</li>
        <li>Edit Messages</li>
        <li>Delete Message</li>
        <li>File Sharing</li>
        <li>GIF Sending</li>
        <li>Polling</li>
        <li>OAuth Integration</li>
        <li>Verification Batdge/li>
    </ul>
    <p>We're constantly working to improve Baatchit and add new features. If you have any questions or feedback, feel free to reach out to us at <a href="mailto:baatchit.online@gmail.com">baatchit.online@gmail.com</a>.</p>
    <p>Thank you for joining us. We look forward to helping you stay connected!</p>
    <p>Best regards,<br>The Baatchit Team</p>`,
    "welcome"
  );
};
var resetPasswordBody = (username, resetUrl) => {
  return emailLayout(`
        <p>Hi ${username},</p>
        <p>We received a request to reset your password for your Baatchit account.</p>
        <p>To create a new password, please click on the following link:</p>
        <a href=${resetUrl}>
            <button>Reset Password</button>
        </a>
        <p>This link will expire in 24 hours. If you did not request a password reset, you can safely ignore this email.</p>
        <p>If you continue to have trouble accessing your account, please contact our support team at <a href="mailto:baatchit.online@gmail.com">baatchit.online@gmail.com</a>.</p>
        <p>Thanks,</p>
        <p>The Baatchit Team</p>
    `, "resetPassword");
};
var otpVerificationBody = (username, otp) => {
  return emailLayout(`
        <p>Hi ${username},</p>
        <p>A verification code is required to access your Baatchit account.</p>
        <p>Your one-time verification code (OTP) is:</p>
        <p class='otp'>${otp}</p>
        <p>This code is valid for ${env.OTP_EXPIRATION_MINUTES} minutes. Please enter it on the verification page to proceed.</p>
        <p>If you did not request OTP verification, you can safely ignore this email.</p>
        <p>For your security, please do not share this code with anyone.</p>
        <p>Thanks,</p>
        <p>The Baatchit Team</p>
    `, "OTP");
};
var privateKeyRecoveryBody = (username, verificationUrl) => {
  return emailLayout(`
        <p>Hello ${username},</p>
        <p>We received a request to recover the private key associated with your Baatchit account. Your private key is essential for decrypting messages and ensuring the confidentiality of your communication.</p>
        <p>To ensure the security of your account, we require you to verify this request. If you did not initiate a private key recovery, simply disregard this email. Your account and private key remain safe.</p>
        <a href="${verificationUrl}">
            <button>Verify Private Key Recovery</button>
        </a>
        <p>For security reasons, this link will expire in ${env.OTP_EXPIRATION_MINUTES} minutes.</p>
        <p>Thank you for your prompt attention to this matter.</p>
        <p>Best regards,</p>
        <p>Baatchit Support Team</p>
    `, "privateKeyRecovery");
};

// src/constants/emails/email.subject.ts
var resetPasswordSubject = "Reset Your Password for Baatchit";
var otpVerificationSubject = "Verify Your Email Address for Baatchit";
var welcomeEmailSubject = "Welcome to Baatchit! Get Started Today \u{1F680}";
var privateKeyRecoverySubject = "Action Required: Verify Your Request to Recover Private Key";

// src/utils/email.util.ts
var sendMail = async (to, username, type, resetUrl, otp, verificationUrl) => {
  await transporter.sendMail({
    from: env.EMAIL,
    to,
    subject: type === "OTP" ? otpVerificationSubject : type === "resetPassword" ? resetPasswordSubject : type === "welcome" ? welcomeEmailSubject : privateKeyRecoverySubject,
    html: type === "OTP" ? otpVerificationBody(username, otp) : type === "resetPassword" ? resetPasswordBody(username, resetUrl) : type === "welcome" ? welcomeEmailBody(username) : privateKeyRecoveryBody(username, verificationUrl)
  });
};

// src/controllers/user.controller.ts
var udpateUser = asyncErrorHandler(
  async (req, res, next) => {
    if (!req.file) {
      return next(new CustomError("Please provide an image", 400));
    }
    let uploadResults;
    const existingAvatarPublicId = req.user.avatarCloudinaryPublicId;
    if (!existingAvatarPublicId) {
      uploadResults = await uploadFilesToCloudinary({ files: [req.file] });
      if (!uploadResults) {
        return next(new CustomError("Some error occured", 500));
      }
    } else {
      const cloudinaryFilePromises = [
        deleteFilesFromCloudinary({ publicIds: [existingAvatarPublicId] }),
        uploadFilesToCloudinary({ files: [req.file] })
      ];
      const [_, result] = await Promise.all(cloudinaryFilePromises);
      if (!result) return next(new CustomError("Some error occured", 500));
      uploadResults = result;
    }
    const user = await prisma.user.update({
      where: {
        id: req.user.id
      },
      data: {
        avatar: uploadResults[0].secure_url,
        avatarCloudinaryPublicId: uploadResults[0].public_id
      }
    });
    const secureUserInfo = {
      id: user.id,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      emailVerified: user.emailVerified,
      publicKey: user.publicKey,
      notificationsEnabled: user.notificationsEnabled,
      verificationBadge: user.verificationBadge,
      fcmToken: user.fcmToken,
      oAuthSignup: user.oAuthSignup
    };
    return res.status(200).json(secureUserInfo);
  }
);
var testEmailHandler = asyncErrorHandler(async (req, res, next) => {
  const { emailType } = req.query;
  if (emailType === "welcome") {
    await sendMail(req.user.email, req.user.username, "welcome", void 0, void 0, void 0);
    return res.status(200).json({ message: `sent ${emailType}` });
  }
  if (emailType === "resetPassword") {
    await sendMail(req.user.email, req.user.username, "resetPassword", "https://mernchat.online", void 0, void 0);
    return res.status(200).json({ message: `sent ${emailType}` });
  }
  if (emailType === "otpVerification") {
    await sendMail(req.user.email, req.user.username, "OTP", void 0, "3412", void 0);
    return res.status(200).json({ message: `sent ${emailType}` });
  }
  if (emailType === "privateKeyRecovery") {
    await sendMail(req.user.email, req.user.username, "privateKeyRecovery", void 0, void 0, "https://mernchat.online");
    return res.status(200).json({ message: `sent ${emailType}` });
  }
  res.status(200);
});

// src/routes/user.router.ts
var user_router_default = Router6().patch("/", verifyToken, upload.single("avatar"), fileValidation, udpateUser).get("/test-email", verifyToken, testEmailHandler);

// src/middlewares/socket-auth.middleware.ts
import jwt4 from "jsonwebtoken";
var socketAuthenticatorMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.query.token;
    if (!token) {
      return next(new CustomError("Token missing, please login again", 401));
    }
    const secret = "helloWorld@123";
    const decodedInfo = jwt4.verify(token, secret, { algorithms: ["HS256"] });
    if (!decodedInfo || !decodedInfo.userId) {
      return next(new CustomError("Invalid token please login again", 401));
    }
    const existingUser = await prisma.user.findUnique({ where: { id: decodedInfo.userId } });
    if (!existingUser) {
      return next(new CustomError("Invalid Token, please login again", 401));
    }
    socket.user = existingUser;
    next();
  } catch (error) {
    console.log(error);
    return next(new CustomError("Invalid Token, please login again", 401));
  }
};

// src/socket/webrtc/socket.ts
var registerWebRtcHandlers = (socket, io2) => {
  socket.on("CALL_USER" /* CALL_USER */, async ({ calleeId, offer }) => {
    try {
      console.log("call user event received from", socket.user.username);
      const calleeSocketId = userSocketIds.get(calleeId);
      if (!calleeSocketId) {
        socket.emit("CALLEE_OFFLINE" /* CALLEE_OFFLINE */);
        socket.emit("CALL_END" /* CALL_END */);
        await prisma.callHistory.create({
          data: {
            callerId: socket.user.id,
            calleeId,
            status: "MISSED"
          }
        });
        const calleeInfo = await prisma.user.findUnique({
          where: { id: calleeId },
          select: { notificationsEnabled: true, fcmToken: true }
        });
        if (calleeInfo && calleeInfo.notificationsEnabled && calleeInfo.fcmToken) {
          sendPushNotification({ fcmToken: calleeInfo.fcmToken, body: `You have missed a call from ${socket.user.username}`, title: "Missed Call" });
        }
        console.log("Callee is offline");
        return;
      }
      const newCall = await prisma.callHistory.create({
        data: {
          callerId: socket.user.id,
          calleeId
        }
      });
      const payload = {
        caller: {
          id: socket.user.id,
          username: socket.user.username,
          avatar: socket.user.avatar
        },
        offer,
        callHistoryId: newCall.id
      };
      const callIdEventSendPayload = {
        callHistoryId: newCall.id
      };
      socket.emit("CALL_ID" /* CALL_ID */, callIdEventSendPayload);
      console.log("emitting incoming call event to", calleeSocketId);
      io2.to(calleeSocketId).emit("INCOMING_CALL" /* INCOMING_CALL */, payload);
    } catch (error) {
      console.log("Error in CALL_USER event", error);
      socket.emit("CALL_END" /* CALL_END */);
    }
  });
  socket.on("CALL_ACCEPTED" /* CALL_ACCEPTED */, async ({ answer, callerId, callHistoryId }) => {
    try {
      const callerSocketId = userSocketIds.get(callerId);
      if (!callerSocketId) {
        const call = await prisma.callHistory.findUnique({ where: { id: callHistoryId } });
        if (!call) {
          console.log("Some Error occured");
          return;
        }
        await prisma.callHistory.update({
          where: { id: callHistoryId },
          data: {
            status: "MISSED"
          }
        });
        const calleeSocketId = userSocketIds.get(call.calleeId);
        if (calleeSocketId) {
          io2.to(calleeSocketId).emit("CALL_END" /* CALL_END */);
          io2.to(calleeSocketId).emit("CALLER_OFFLINE" /* CALLER_OFFLINE */);
        }
        return;
      }
      const payload = {
        calleeId: socket.user.id,
        answer,
        callHistoryId
      };
      socket.to(callerSocketId).emit("CALL_ACCEPTED" /* CALL_ACCEPTED */, payload);
    } catch (error) {
      console.log("Error in CALL_ACCEPTED event", error);
    }
  });
  socket.on("CALL_REJECTED" /* CALL_REJECTED */, async ({ callHistoryId }) => {
    const call = await prisma.callHistory.findUnique({
      where: { id: callHistoryId }
    });
    try {
      if (!call) {
        console.log(`Call not found for callHistoryId: ${callHistoryId}`);
        return;
      }
      const updatedCall = await prisma.callHistory.update({
        where: { id: call.id },
        data: { status: "REJECTED" }
      });
      const callerSocketId = userSocketIds.get(updatedCall.callerId);
      const calleeSocketId = userSocketIds.get(updatedCall.calleeId);
      if (callerSocketId) {
        socket.to(callerSocketId).emit("CALL_REJECTED" /* CALL_REJECTED */);
        socket.to(callerSocketId).emit("CALL_END" /* CALL_END */);
      }
      if (calleeSocketId) {
        io2.to(calleeSocketId).emit("CALL_END" /* CALL_END */);
      }
    } catch (error) {
      console.log("Error in CALL_REJECTED event", error);
    }
  });
  socket.on("CALL_END" /* CALL_END */, async ({ callHistoryId, wasCallAccepted }) => {
    try {
      const ongoingCall = await prisma.callHistory.findUnique({ where: { id: callHistoryId } });
      if (!ongoingCall) {
        console.log(`Ongoing call not found for callHistoryId: ${callHistoryId}`);
        return;
      }
      await prisma.callHistory.update({
        where: { id: ongoingCall.id },
        data: {
          endedAt: /* @__PURE__ */ new Date(),
          duration: Math.floor(((/* @__PURE__ */ new Date()).getTime() - ongoingCall.startedAt.getTime()) / 1e3),
          status: !wasCallAccepted ? "MISSED" : "COMPLETED"
        }
      });
      const callerSocketId = userSocketIds.get(ongoingCall.callerId);
      const calleeSocketId = userSocketIds.get(ongoingCall.calleeId);
      if (callerSocketId) {
        io2.to(callerSocketId).emit("CALL_END" /* CALL_END */);
      }
      if (calleeSocketId) {
        io2.to(calleeSocketId).emit("CALL_END" /* CALL_END */);
      }
    } catch (error) {
      console.error(`Error in CALL_END event for callHistoryId: ${callHistoryId}`, error);
    }
  });
  socket.on("CALLEE_BUSY" /* CALLEE_BUSY */, ({ callerId }) => {
    const callerSocketId = userSocketIds.get(callerId);
    if (callerSocketId) {
      socket.to(callerSocketId).emit("CALLEE_BUSY" /* CALLEE_BUSY */);
      socket.to(callerSocketId).emit("CALL_END" /* CALL_END */);
    }
  });
  socket.on("ICE_CANDIDATE" /* ICE_CANDIDATE */, async ({ candidate, calleeId }) => {
    console.log("ice candiate receive from ", socket.user.username);
    const calleeSocketId = userSocketIds.get(calleeId);
    if (!calleeSocketId) {
      console.log("Callee is offline during ice candidate exchange");
      return;
    }
    const payload = {
      callerId: socket.user.id,
      candidate
    };
    io2.to(calleeSocketId).emit("ICE_CANDIDATE" /* ICE_CANDIDATE */, payload);
  });
  socket.on("NEGO_NEEDED" /* NEGO_NEEDED */, async ({ offer, calleeId, callHistoryId }) => {
    try {
      const calleeSocketId = userSocketIds.get(calleeId);
      if (!calleeSocketId) {
        const call = await prisma.callHistory.findUnique({ where: { id: callHistoryId } });
        if (!call) {
          console.error(`Call history not found for callHistoryId: ${callHistoryId}`);
          return;
        }
        await prisma.$transaction([
          prisma.callHistory.update({
            where: { id: callHistoryId },
            data: { status: "MISSED" }
          })
        ]);
        const callerSocketId = userSocketIds.get(call.callerId);
        if (callerSocketId) {
          io2.to(callerSocketId).emit("CALLEE_OFFLINE" /* CALLEE_OFFLINE */);
          io2.to(callerSocketId).emit("CALL_END" /* CALL_END */);
        }
        return;
      }
      const payload = {
        offer,
        callerId: socket.user.id,
        callHistoryId
      };
      socket.to(calleeSocketId).emit("NEGO_NEEDED" /* NEGO_NEEDED */, payload);
    } catch (error) {
      console.log("Error in NEGO_NEEDED event", error);
    }
  });
  socket.on("NEGO_DONE" /* NEGO_DONE */, async ({ answer, callerId, callHistoryId }) => {
    try {
      const callerSocketId = userSocketIds.get(callerId);
      if (!callerSocketId) {
        const call = await prisma.callHistory.findUnique({ where: { id: callHistoryId } });
        if (!call) {
          console.warn(`Call history not found or already updated for callHistoryId: ${callHistoryId}`);
          return;
        }
        await prisma.$transaction([
          prisma.callHistory.update({
            where: { id: callHistoryId },
            data: { status: "MISSED" }
          })
        ]);
        const calleeSocketId = userSocketIds.get(call.calleeId);
        if (calleeSocketId) {
          io2.to(calleeSocketId).emit("CALL_END" /* CALL_END */);
          io2.to(calleeSocketId).emit("CALLER_OFFLINE" /* CALLER_OFFLINE */);
        }
        return;
      }
      const payload = {
        answer,
        calleeId: socket.user.id
      };
      socket.to(callerSocketId).emit("NEGO_FINAL" /* NEGO_FINAL */, payload);
    } catch (error) {
      console.log("Error in NEGO_DONE event", error);
    }
  });
};
var socket_default = registerWebRtcHandlers;

// src/socket/socket.ts
var registerSocketHandlers = (io2) => {
  io2.on("connection", async (socket) => {
    console.log(socket.user.username, "connected");
    await prisma.user.update({
      where: { id: socket.user.id },
      data: { isOnline: true }
    });
    userSocketIds.set(socket.user.id, socket.id);
    const payload = {
      userId: socket.user.id
    };
    socket.broadcast.emit("ONLINE_USER" /* ONLINE_USER */, payload);
    const onlineUserIds = Array.from(userSocketIds.keys());
    let payloadOnlineUsers = {
      onlineUserIds
    };
    socket.emit("ONLINE_USERS_LIST" /* ONLINE_USERS_LIST */, payloadOnlineUsers);
    const userChats = await prisma.chatMembers.findMany({
      where: {
        userId: socket.user.id
      },
      select: { chatId: true }
    });
    const chatIds = userChats.map(({ chatId }) => chatId);
    socket.join(chatIds);
    socket.on("MESSAGE" /* MESSAGE */, async ({ chatId, isPollMessage, pollData, textMessageContent, url, encryptedAudio, audio, replyToMessageId }) => {
      try {
        let newMessage;
        if (audio) {
          const uploadResult = await uploadAudioToCloudinary({ buffer: audio });
          if (!uploadResult) return;
          newMessage = await prisma.message.create({
            data: {
              senderId: socket.user.id,
              chatId,
              isTextMessage: false,
              isPollMessage: false,
              audioPublicId: uploadResult.public_id,
              audioUrl: uploadResult.secure_url,
              replyToMessageId
            }
          });
        } else if (encryptedAudio) {
          const uploadResult = await uploadEncryptedAudioToCloudinary({ buffer: encryptedAudio });
          if (!uploadResult) return;
          newMessage = await prisma.message.create({
            data: {
              senderId: socket.user.id,
              chatId,
              isTextMessage: false,
              isPollMessage: false,
              audioPublicId: uploadResult.public_id,
              audioUrl: uploadResult.secure_url,
              replyToMessageId
            }
          });
        } else if (isPollMessage && pollData?.pollOptions && pollData.pollQuestion) {
          const newPoll = await prisma.poll.create({
            data: {
              question: pollData.pollQuestion,
              options: pollData.pollOptions,
              multipleAnswers: pollData.isMultipleAnswers ? pollData.isMultipleAnswers : false
            }
          });
          newMessage = await prisma.message.create({
            data: {
              senderId: socket.user.id,
              chatId,
              pollId: newPoll.id,
              isPollMessage: true,
              isTextMessage: false,
              replyToMessageId
            }
          });
        } else if (url) {
          newMessage = await prisma.message.create({
            data: {
              senderId: socket.user.id,
              chatId,
              url,
              isPollMessage: false,
              isTextMessage: false,
              replyToMessageId
            }
          });
        } else {
          newMessage = await prisma.message.create({
            data: {
              senderId: socket.user.id,
              chatId,
              isPollMessage: false,
              isTextMessage: true,
              textMessageContent,
              replyToMessageId
            }
          });
        }
        const currentChat = await prisma.chat.update({
          where: { id: chatId },
          data: { latestMessageId: newMessage.id },
          include: {
            ChatMembers: {
              select: {
                user: {
                  select: {
                    id: true,
                    isOnline: true,
                    notificationsEnabled: true,
                    fcmToken: true
                  }
                }
              }
            }
          }
        });
        const message = await prisma.message.findUnique({
          where: { chatId, id: newMessage.id },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                avatar: true
              }
            },
            attachments: {
              select: {
                secureUrl: true
              }
            },
            poll: {
              omit: {
                id: true
              },
              include: {
                votes: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        username: true,
                        avatar: true
                      }
                    }
                  },
                  omit: {
                    id: true,
                    pollId: true,
                    userId: true
                  }
                }
              }
            },
            reactions: {
              select: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    avatar: true
                  }
                },
                reaction: true
              }
            },
            replyToMessage: {
              select: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                    avatar: true
                  }
                },
                id: true,
                textMessageContent: true,
                isPollMessage: true,
                url: true,
                audioUrl: true,
                attachments: {
                  select: {
                    secureUrl: true
                  }
                }
              }
            }
          },
          omit: {
            senderId: true,
            pollId: true,
            audioPublicId: true
          }
        });
        io2.to(chatId).emit("MESSAGE" /* MESSAGE */, { ...message, isNew: true });
        const currentChatMembers = currentChat.ChatMembers.filter(({ user: { id } }) => id != socket.user.id);
        const updateOrCreateUnreadMessagePromises = currentChatMembers.map(async (member) => {
          if (!member.user.isOnline && member.user.notificationsEnabled && member.user.fcmToken) {
            sendPushNotification({ fcmToken: member.user.fcmToken, body: `New message from ${socket.user.username}` });
          }
          const isExistingUnreadMessage = await prisma.unreadMessages.findUnique({
            where: {
              userId_chatId: {
                userId: member.user.id,
                chatId
              }
            }
          });
          if (isExistingUnreadMessage) {
            return prisma.unreadMessages.update({
              where: {
                userId_chatId: {
                  userId: member.user.id,
                  chatId
                }
              },
              data: {
                count: {
                  increment: 1
                },
                messageId: newMessage.id
              }
            });
          } else {
            return prisma.unreadMessages.create({
              data: {
                userId: member.user.id,
                chatId,
                count: 1,
                senderId: socket.user.id,
                messageId: newMessage.id
              }
            });
          }
        });
        await Promise.all(updateOrCreateUnreadMessagePromises);
        const unreadMessagePayload = {
          chatId,
          message: {
            textMessageContent: newMessage.isTextMessage ? newMessage.textMessageContent : void 0,
            url: newMessage.url ? true : false,
            attachments: false,
            poll: newMessage.isPollMessage ? true : false,
            audio: newMessage.audioPublicId ? true : false,
            createdAt: newMessage.createdAt
          },
          sender: {
            id: socket.user.id,
            avatar: socket.user.avatar,
            username: socket.user.username
          }
        };
        io2.to(chatId).emit("UNREAD_MESSAGE" /* UNREAD_MESSAGE */, unreadMessagePayload);
      } catch (error) {
        console.log("Error sending message:", error);
      }
    });
    socket.on("MESSAGE_SEEN" /* MESSAGE_SEEN */, async ({ chatId }) => {
      try {
        const doesUnreadMessageExists = await prisma.unreadMessages.findUnique({
          where: {
            userId_chatId: {
              userId: socket.user.id,
              chatId
            }
          }
        });
        if (!doesUnreadMessageExists) return;
        const unreadMessageData = await prisma.unreadMessages.update({
          where: {
            id: doesUnreadMessageExists.id
          },
          data: {
            count: 0,
            readAt: /* @__PURE__ */ new Date()
          }
        });
        const payload2 = {
          user: {
            id: socket.user.id,
            username: socket.user.username,
            avatar: socket.user.avatar
          },
          chatId,
          readAt: unreadMessageData.readAt
        };
        io2.to(chatId).emit("MESSAGE_SEEN" /* MESSAGE_SEEN */, payload2);
      } catch (error) {
        console.log("Error marking message as seen:", error);
      }
    });
    socket.on("MESSAGE_EDIT" /* MESSAGE_EDIT */, async ({ chatId, messageId, updatedTextContent }) => {
      try {
        const message = await prisma.message.update({
          where: {
            chatId,
            id: messageId
          },
          data: {
            textMessageContent: updatedTextContent,
            isEdited: true
          }
        });
        const payload2 = {
          updatedTextMessageContent: message.textMessageContent,
          chatId,
          messageId
        };
        io2.to(chatId).emit("MESSAGE_EDIT" /* MESSAGE_EDIT */, payload2);
      } catch (error) {
        console.log("Error editing message:", error);
      }
    });
    socket.on("MESSAGE_DELETE" /* MESSAGE_DELETE */, async ({ chatId, messageId }) => {
      try {
        await prisma.pinnedMessages.deleteMany({ where: { messageId } });
        await prisma.message.updateMany({
          where: { replyToMessageId: messageId },
          data: { replyToMessageId: null }
        });
        await prisma.unreadMessages.deleteMany({ where: { messageId } });
        await prisma.reactions.deleteMany({ where: { messageId } });
        const messageToBeDeleted = await prisma.message.findUnique({
          where: { chatId, id: messageId },
          select: { audioPublicId: true, attachments: { select: { cloudinaryPublicId: true } } }
        });
        if (!messageToBeDeleted) return;
        let publicIds = [];
        if (messageToBeDeleted?.attachments.length) {
          console.log("deleting attachments from Cloudinary");
          const cloudinaryPublicIdsOfAttachments = messageToBeDeleted?.attachments.map(({ cloudinaryPublicId }) => cloudinaryPublicId);
          publicIds.push(...cloudinaryPublicIdsOfAttachments);
          await prisma.attachment.deleteMany({ where: { messageId } });
        }
        if (messageToBeDeleted?.audioPublicId) {
          console.log("deleting audio from Cloudinary");
          publicIds.push(messageToBeDeleted.audioPublicId);
        }
        if (publicIds.length) {
          await deleteFilesFromCloudinary({ publicIds });
        }
        const deletedMessage = await prisma.message.delete({
          where: { id: messageId },
          select: { id: true }
        });
        if (deletedMessage.id) {
          const payload2 = {
            messageId: deletedMessage.id,
            chatId
          };
          io2.to(chatId).emit("MESSAGE_DELETE" /* MESSAGE_DELETE */, payload2);
        }
      } catch (error) {
        console.log("Error deleting message:", error);
      }
    });
    socket.on("NEW_REACTION" /* NEW_REACTION */, async ({ chatId, messageId, reaction }) => {
      try {
        const result = await prisma.reactions.findFirst({
          where: {
            userId: socket.user.id,
            messageId
          }
        });
        if (result) return;
        await prisma.reactions.create({
          data: {
            reaction,
            userId: socket.user.id,
            messageId
          }
        });
        const payload2 = {
          chatId,
          messageId,
          user: {
            id: socket.user.id,
            username: socket.user.username,
            avatar: socket.user.avatar
          },
          reaction
        };
        io2.to(chatId).emit("NEW_REACTION" /* NEW_REACTION */, payload2);
      } catch (error) {
        console.log("Error adding reaction:", error);
      }
    });
    socket.on("DELETE_REACTION" /* DELETE_REACTION */, async ({ chatId, messageId }) => {
      try {
        await prisma.reactions.deleteMany({
          where: {
            userId: socket.user.id,
            messageId
          }
        });
        const payload2 = {
          chatId,
          messageId,
          userId: socket.user.id
        };
        io2.to(chatId).emit("DELETE_REACTION" /* DELETE_REACTION */, payload2);
      } catch (error) {
        console.log("Error deleting reaction:", error);
      }
    });
    socket.on("USER_TYPING" /* USER_TYPING */, ({ chatId }) => {
      try {
        const payload2 = {
          user: {
            id: socket.user.id,
            username: socket.user.username,
            avatar: socket.user.avatar
          },
          chatId
        };
        socket.broadcast.to(chatId).emit("USER_TYPING" /* USER_TYPING */, payload2);
      } catch (error) {
        console.log("Error user typing:", error);
      }
    });
    socket.on("VOTE_IN" /* VOTE_IN */, async ({ chatId, messageId, optionIndex }) => {
      console.log("vote in received");
      try {
        const isValidPoll = await prisma.message.findFirst({
          where: { chatId, id: messageId },
          include: {
            poll: {
              select: {
                id: true
              }
            }
          }
        });
        if (!isValidPoll?.poll?.id) return;
        await prisma.vote.create({
          data: {
            pollId: isValidPoll.poll.id,
            userId: socket.user.id,
            optionIndex
          }
        });
        const payload2 = {
          messageId,
          optionIndex,
          user: {
            id: socket.user.id,
            avatar: socket.user.avatar,
            username: socket.user.username
          },
          chatId
        };
        io2.to(chatId).emit("VOTE_IN" /* VOTE_IN */, payload2);
      } catch (error) {
        console.log("error in vote in:", error);
      }
    });
    socket.on("VOTE_OUT" /* VOTE_OUT */, async ({ chatId, messageId, optionIndex }) => {
      console.log("vote out received");
      try {
        const isValidPoll = await prisma.message.findFirst({
          where: { chatId, id: messageId },
          include: {
            poll: {
              select: {
                id: true
              }
            }
          }
        });
        if (!isValidPoll?.poll?.id) return;
        const vote = await prisma.vote.findFirst({
          where: {
            userId: socket.user.id,
            pollId: isValidPoll.poll.id,
            optionIndex
          }
        });
        if (!vote) return;
        await prisma.vote.deleteMany({
          where: {
            userId: socket.user.id,
            pollId: isValidPoll.poll.id,
            optionIndex
          }
        });
        const payload2 = {
          chatId,
          messageId,
          optionIndex,
          userId: socket.user.id
        };
        io2.to(chatId).emit("VOTE_OUT" /* VOTE_OUT */, payload2);
      } catch (error) {
        console.log("error in vote out:", error);
      }
    });
    socket.on("PIN_MESSAGE" /* PIN_MESSAGE */, async ({ chatId, messageId }) => {
      try {
        console.log("messageId for pinning message is:", messageId);
        const pinnedMessages = await prisma.pinnedMessages.findMany({
          where: { chatId },
          orderBy: { createdAt: "asc" }
          // Get the oldest pinned message first
        });
        if (pinnedMessages.length === 3) {
          await prisma.pinnedMessages.delete({ where: { id: pinnedMessages[0].id } });
          const unpinnedMessage = await prisma.message.update({ where: { id: pinnedMessages[0].messageId }, data: { isPinned: false }, select: { id: true } });
          const payload2 = {
            oldestPinId: pinnedMessages[0].id,
            messageId: unpinnedMessage.id,
            chatId
          };
          io2.to(chatId).emit("PIN_LIMIT_REACHED" /* PIN_LIMIT_REACHED */, payload2);
        }
        const pinnedMessage = await prisma.pinnedMessages.create({
          data: {
            messageId,
            chatId
          },
          include: {
            message: {
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                    avatar: true
                  }
                },
                attachments: {
                  select: {
                    secureUrl: true
                  }
                },
                poll: {
                  omit: {
                    id: true
                  },
                  include: {
                    votes: {
                      include: {
                        user: {
                          select: {
                            id: true,
                            username: true,
                            avatar: true
                          }
                        }
                      },
                      omit: {
                        id: true,
                        pollId: true,
                        userId: true
                      }
                    }
                  }
                },
                reactions: {
                  select: {
                    user: {
                      select: {
                        id: true,
                        username: true,
                        avatar: true
                      }
                    },
                    reaction: true
                  }
                },
                replyToMessage: {
                  select: {
                    sender: {
                      select: {
                        id: true,
                        username: true,
                        avatar: true
                      }
                    },
                    id: true,
                    textMessageContent: true,
                    isPollMessage: true,
                    url: true,
                    audioUrl: true,
                    attachments: {
                      select: {
                        secureUrl: true
                      }
                    }
                  }
                }
              },
              omit: {
                senderId: true,
                pollId: true
              }
            }
          },
          omit: {
            chatId: true,
            messageId: true
          }
        });
        await prisma.message.update({ where: { id: messageId }, data: { isPinned: true } });
        io2.to(chatId).emit("PIN_MESSAGE" /* PIN_MESSAGE */, pinnedMessage);
      } catch (error) {
        console.log("error pinning message:", error);
      }
    });
    socket.on("UNPIN_MESSAGE" /* UNPIN_MESSAGE */, async ({ pinId }) => {
      try {
        const deletedPinnedMessage = await prisma.pinnedMessages.delete({
          where: {
            id: pinId
          },
          select: {
            id: true,
            chatId: true,
            messageId: true
          }
        });
        await prisma.message.update({ where: { id: deletedPinnedMessage.messageId }, data: { isPinned: false } });
        const payload2 = {
          pinId: deletedPinnedMessage.id,
          chatId: deletedPinnedMessage.chatId,
          messageId: deletedPinnedMessage.messageId
        };
        io2.to(deletedPinnedMessage.chatId).emit("UNPIN_MESSAGE" /* UNPIN_MESSAGE */, payload2);
      } catch (error) {
        console.log("error un-pinning message:", error);
      }
    });
    socket_default(socket, io2);
    socket.on("disconnect", async () => {
      await prisma.user.update({
        where: {
          id: socket.user.id
        },
        data: {
          isOnline: false,
          lastSeen: /* @__PURE__ */ new Date()
        }
      });
      userSocketIds.delete(socket.user.id);
      const payload2 = {
        userId: socket.user.id
      };
      socket.broadcast.emit("OFFLINE_USER" /* OFFLINE_USER */, payload2);
    });
  });
};
var socket_default2 = registerSocketHandlers;

// src/index.ts
checkEnvVariables();
var app = express();
var server = createServer(app);
var io = new Server(server, { cors: { credentials: true, origin: config2.clientUrl } });
app.set("io", io);
var userSocketIds = /* @__PURE__ */ new Map();
app.use(cors({ credentials: true, origin: config2.clientUrl }));
app.use(passport3.initialize());
app.use(express.json());
app.use(cookieParser());
app.use(morgan("tiny"));
app.use("/api/v1/auth", auth_router_default);
app.use("/api/v1/chat", chat_router_default);
app.use("/api/v1/user", user_router_default);
app.use("/api/v1/request", request_router_default);
app.use("/api/v1/message", message_router_default);
app.use("/api/v1/attachment", attachment_router_default);
io.use(socketAuthenticatorMiddleware);
app.get("/", (_, res) => {
  res.status(200).json({ running: true });
});
app.use(errorMiddleware);
socket_default2(io);
server.listen(env.PORT, () => {
  console.log(`server [STARTED] ~ http://localhost:${env.PORT}`);
  if (env.NODE_ENV === "PRODUCTION") {
    console.log("Started in PRODUCTION mode");
  } else {
    console.log("Started in DEVELOPMENT mode");
  }
});
export {
  userSocketIds
};
