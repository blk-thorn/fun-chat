export interface User {
    id: number;
    login: string;
    password: string;
}

export default interface IMessageOptions {
    recipient: string;
    datetime?: number;
    text: string;
    time?: string;
    sender?: string;
    isCurrentUser?: boolean;
    status?: string; // '✓', '👁✓', '🕒'
    isEdited?: boolean;
}
