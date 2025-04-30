export interface IMessageOptions {
    text: string;
    datetime: number;
    recipient: string;
    isCurrentUser: boolean;
    status: string | {isDelivered: boolean, isReaded: boolean, isEdited: boolean};
    isEdited: boolean;
    id: string;
    senderName: string;
    currentUser: string;
}

export default interface User {
    login: string;
    isOnline?: boolean;
}
