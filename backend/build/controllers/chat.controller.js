import { DEFAULT_AVATAR } from "../constants/file.constant.js";
import { Events } from "../enums/event/event.enum.js";
import { prisma } from "../lib/prisma.lib.js";
import { uploadFilesToCloudinary } from "../utils/auth.util.js";
import { joinMembersInChatRoom } from "../utils/chat.util.js";
import { CustomError, asyncErrorHandler } from "../utils/error.utils.js";
import { emitEventToRoom } from "../utils/socket.util.js";
const createChat = asyncErrorHandler(async (req, res, next) => {
    let uploadResults = [];
    const { isGroupChat, members, name } = req.body;
    if (isGroupChat === "true") {
        if (members.length < 2) {
            return next(new CustomError("At least 2 members are required to create group chat", 400));
        }
        else if (!name) {
            return next(new CustomError("Name is required for creating group chat", 400));
        }
        const memberIds = [...members, req.user.id];
        let hasAvatar = false;
        if (req.file) {
            hasAvatar = true;
            uploadResults = await uploadFilesToCloudinary({ files: [req.file] });
        }
        const avatar = hasAvatar && uploadResults && uploadResults[0]
            ? uploadResults[0].secure_url
            : DEFAULT_AVATAR;
        const avatarCloudinaryPublicId = hasAvatar && uploadResults && uploadResults[0]
            ? uploadResults[0].public_id
            : null;
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
                            }
                        }
                    }
                }
            }
        });
        if (!populatedChat) {
            return next(new CustomError("Failed to fetch newly created chat", 500));
        }
        const { avatarCloudinaryPublicId: _, ...safeChat } = populatedChat;
        const io = req.app.get("io");
        joinMembersInChatRoom({ memberIds, roomToJoin: newChat.id, io });
        emitEventToRoom({
            event: Events.NEW_CHAT,
            io,
            room: newChat.id,
            data: { ...safeChat, typingUsers: [] }
        });
        return res.status(201).json({ success: true });
    }
});
const getUserChats = asyncErrorHandler(async (req, res) => {
    const chats = await prisma.chat.findMany({
        where: {
            ChatMembers: {
                some: {
                    userId: req.user.id
                }
            }
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
                        }
                    }
                }
            }
        }
    });
    const safeChats = chats.map(({ avatarCloudinaryPublicId, ...rest }) => ({
        ...rest,
        typingUsers: []
    }));
    return res.status(200).json(safeChats);
});
