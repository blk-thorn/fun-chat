export default interface User {
    login: string;
    isLogined: boolean;
    isOnline?: boolean;
    id?: number;
    password?: string;
};

export interface MessageData {
    id: string;
    type: string;
    payload: {
        message: {
            id: string;
            from: string;
            to: string;
            text: string;
            datetime: number;
            status: {
                isDelivered: boolean;
                isReaded: boolean;
                isEdited: boolean;
            };
        };
    };
}

export interface IMessageOptions {
    recipient: string;
    datetime?: number;
    text: string;
    isCurrentUser?: boolean;
    status?: string;
    isEdited?: boolean;
    id: string;
    currentUser?: string;
}
