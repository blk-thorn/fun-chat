import type User from '../../../types/types';

export default class MainWebsocket {
    private ws: WebSocket;
    private onUsersUpdate: ((users: User[]) => void) | undefined;
    private activeUsers: Set<string> = new Set();
    private onLogout: ((user: {login: string, isLogined: boolean}) => void) | undefined;
    private onMessage: ((message: any) => void) | undefined;
    private onMessageHistory: ((messages: any[]) => void) | undefined;
    private onMessageStatusUpdate: ((update: {messageId: string, status: any}) => void) | undefined;
    private onExternalLogout: ((userLogin: string) => void) | undefined;

    constructor(ws: WebSocket) {
        this.ws = ws;
        this.setupWebSocketListeners();
    }

    private setupWebSocketListeners(): void {
        this.ws.onmessage = (event): void => {
            try {
                const response = JSON.parse(event.data);
                this.handleServerResponse(response);
            } catch (error) {
                console.error(error);
            }
        };

        this.ws.onclose = () => {
            this.activeUsers.clear();
        };
    }

    private handleServerResponse(response: any): void {
        console.log('WebSocket received:', response.type, response);

        if (response.type === 'USER_ACTIVE') {
            const users = response.payload.users || [];
            this.activeUsers = new Set(users.map((u: User) => u.login));

            const usersWithStatus = users.map((user: User) => ({
                ...user,
                isOnline: true
            }));

            this.callIfDefined(this.onUsersUpdate, usersWithStatus);

        } else if (response.type === 'MSG_FROM_USER') {
            const messages = response.payload?.messages || [];
            console.log('MSG_FROM_USER received with', messages.length, 'messages');
            this.callIfDefined(this.onMessageHistory, messages);

        } else if (response.type === 'USER_LOGOUT') {
            this.onLogout?.(response.payload.user);

        } else if (response.type === 'USER_EXTERNAL_LOGOUT') {
            const userLogin = response.payload?.user?.login;
            if (userLogin && this.onExternalLogout) {
                this.onExternalLogout(userLogin);
            }

        } else if (response.type === 'MSG_SEND') {
            if (this.onMessage) {
                const messageWithSender = {
                    ...response,
                    payload: {
                        ...response.payload,
                        isCurrentUser: true,
                        senderName: response.payload.from
                    }
                };
                this.onMessage(messageWithSender);
            }

        } else if (response.type === 'MSG_5END') {
            if (this.onMessage) {
                const incomingMessage = {
                    ...response,
                    payload: {
                        ...response.payload,
                        isCurrentUser: false,
                        senderName: response.payload.from
                    }
                };
                this.onMessage(incomingMessage);
            }

        } else if (response.type === 'MSG_DELIVER') {
            if (this.onMessageStatusUpdate) {
                this.onMessageStatusUpdate({
                    messageId: response.payload.message.id,
                    status: {
                        isDelivered: true,
                        isReaded: false,
                        isEdited: false
                    }
                });
            }

        } else if (response.type === 'MSG_READ') {
            if (this.onMessageStatusUpdate) {
                this.onMessageStatusUpdate({
                    messageId: response.payload.message.id,
                    status: {
                        isDelivered: true,
                        isReaded: true,
                        isEdited: false
                    }
                });
            }

        } else if (response.type === 'MSG_EDIT') {
            if (this.onMessageStatusUpdate) {
                this.onMessageStatusUpdate({
                    messageId: response.payload.message.id,
                    status: {
                        isDelivered: true,
                        isReaded: response.payload.message.status?.isReaded || false,
                        isEdited: true
                    }
                });
            }
        }
    }

    public requestActiveUsers(): void {
        if (this.ws.readyState !== WebSocket.OPEN) {
            setTimeout(() => this.requestActiveUsers(), 100);
            return;
        }

        const request = {
            id: `req_${Date.now()}`,
            type: 'USER_ACTIVE',
            payload: {}
        };
        this.ws.send(JSON.stringify(request));
    }

    public requestInactiveUsers(): void {
        if (this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        const request = {
            id: `req_${Date.now()}`,
            type: 'USER_INACTIVE',
            payload: null
        };
        this.ws.send(JSON.stringify(request));
    }

    public requestMessageHistory(withUser?: string): void {
        if (this.ws.readyState !== WebSocket.OPEN) {
            setTimeout(() => this.requestMessageHistory(withUser), 200);
            return;
        }

        const request = {
            id: `req_history_${Date.now()}`,
            type: 'MSG_FROM_USER',
            payload: {
                user: {
                    login: withUser
                }
            }
        };

        console.log('Requesting message history for user:', withUser || 'all');
        this.ws.send(JSON.stringify(request));
    }

    public setOnUsersUpdate(callback: (users: User[]) => void): void {
        this.onUsersUpdate = callback;
    }

    public sendMessage(message: any): void {
        if (this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        try {
            this.ws.send(JSON.stringify(message));
        } catch (error) {
            console.error(error);
        }
    }

    private callIfDefined<T>(callback: ((arg: T) => void) | undefined, arg: T): void {
        callback && callback(arg);
    }

    public sendLogoutRequest(userLogin: string, userPassword: string): void {
        if (this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        const request = {
            id: `req_${Date.now()}`,
            type: 'USER_LOGOUT',
            payload: {
                user: {
                    login: userLogin,
                    password: userPassword
                }
            }
        };
        this.ws.send(JSON.stringify(request));
    }

    public setOnLogout(callback: (user: {login: string, isLogined: boolean}) => void): void {
        this.onLogout = callback;
    }

    public setOnMessage(callback: (message: any) => void): void {
        this.onMessage = callback;
    }

    public setOnMessageHistory(callback: (messages: any[]) => void): void {
        this.onMessageHistory = callback;
    }

    public setOnMessageStatusUpdate(callback: (update: {messageId: string, status: any}) => void): void {
        this.onMessageStatusUpdate = callback;
    }

    public setOnExternalLogout(callback: (userLogin: string) => void): void {
        this.onExternalLogout = callback;
    }

    public destroy(): void {
        this.ws.onmessage = null;
        this.onUsersUpdate = undefined;
        this.onLogout = undefined;
        this.onMessage = undefined;
        this.onMessageHistory = undefined;
        this.onMessageStatusUpdate = undefined;
        this.onExternalLogout = undefined;
    }
}
