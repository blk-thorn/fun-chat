import type User from '../../../types/types';

export default class MainWebsocket {
    private ws: WebSocket;
    private onUsersUpdate: ((users: User[]) => void) | undefined;
    private activeUsers: Set<string> = new Set();
    private onLogout: ((user: {login: string, isLogined: boolean}) => void) | undefined;
    private onMessage: ((message: any) => void) | undefined;
    private onMessageHistory: ((messages: any[]) => void) | undefined;

    constructor(ws: WebSocket) {
        this.ws = ws;
        this.setupWebSocketListeners();
    }

    private setupWebSocketListeners(): void {
        this.ws.onmessage = (event): void => {
            try {
                const response = JSON.parse(event.data);
                console.log('Response:', response);
                this.handleServerResponse(response);
            } catch (error) {
                console.error(error);
            }
        };

        this.ws.onclose = () => {
            this.activeUsers.clear();
        };
    }

    private handleServerResponse(response: any ): void {
        if (response.type === 'USER_ACTIVE') {
            const users = response.payload.users || [];
            this.activeUsers = new Set(users.map((u: User) => u.login));

            const usersWithStatus = users.map((user: User) => ({
                ...user,
                isOnline: true
            }));

            this.callIfDefined(this.onUsersUpdate, usersWithStatus);
        } else if (response.type === 'USER_LOGOUT') {
            if (this.onLogout) {
                this.onLogout(response.payload.user);
            }
        } else if (response.type === 'MSG_SEND') {
            if (this.onMessage) {
                this.onMessage(response);
            }
        } else if (response.type === 'MSG_FROM_USER') {
            this.callIfDefined(this.onMessageHistory, response.payload.messages || []);
        }
    }

    public requestActiveUsers(): void {
        const request = {
            id: `req_${Date.now()}`,
            type: 'USER_ACTIVE',
            payload: {}
        };
        this.ws.send(JSON.stringify(request));
    }

    public requestInactiveUsers(): void {
        const request = {
            id: `req_${Date.now()}`,
            type: 'USER_INACTIVE',
            payload: null
        };
        this.ws.send(JSON.stringify(request));
    }

    public setOnUsersUpdate(callback: (users: User[]) => void): void {
        this.onUsersUpdate = callback;
    }

    public sendMessage(message: any): void {
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
        this.ws.addEventListener('message', (event): void => {
            const data = JSON.parse(event.data);
            if (data.type === "MSG_SEND") {
                callback(data);
            }
        });
    }

    public destroy(): void {
        this.ws.onmessage = null;
        this.onUsersUpdate = undefined;
    }
}
