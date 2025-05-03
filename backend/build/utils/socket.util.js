import { userSocketIds } from "../index.js";
export const emitEvent = ({ data, event, io, users }) => {
    const sockets = getMemberSockets(users);
    if (sockets) {
        io.to(sockets).emit(event, data);
    }
};
export const emitEventToRoom = ({ data, event, io, room }) => {
    io.to(room).emit(event, data);
};
export const getOtherMembers = ({ members, user }) => {
    return members.filter(member => member !== user);
};
export const getMemberSockets = (members) => {
    return members.map(member => userSocketIds.get(member));
};
