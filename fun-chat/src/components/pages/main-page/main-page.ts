import './main-page.css'
import MainWebsocket from '../main-page/main-websocket';
import type { IMessageOptions } from '../../../types/types';
import Message from '../../../message/message';
import type User from '../../../types/types';

export default class MainPage {
    private readonly container: HTMLElement;
    currentUser: string;
    private wsHandler: MainWebsocket;
    private users: User[] = [];
    userPassword: string;
    private readonly onLogoutSuccess: () => void;
    private selectedUser: string | null = null;
    private textarea: HTMLTextAreaElement | null = null;
    private sendButton: HTMLButtonElement | null = null;
    private chatContent: HTMLElement | null = null;

    constructor(
        id: string,
        currentUser: string,
        userPassword: string,
        ws: WebSocket,
        onLogoutSuccess: () => void
    ) {
        this.container = document.createElement('main');
        this.container.id = id;
        this.container.classList.add('main');
        this.currentUser = currentUser;
        this.wsHandler = new MainWebsocket(ws);
        this.userPassword = userPassword;
        this.onLogoutSuccess = onLogoutSuccess;

        this.setupWebSocketHandlers();
        this.wsHandler.requestActiveUsers();
        this.wsHandler.requestInactiveUsers();
        this.setupTabSync();
    }

    private setupTabSync(): void {
        window.addEventListener('focus', () => {
            this.wsHandler.requestActiveUsers();
        });

        window.addEventListener('storage', (event) => {
            if (event.key === 'chat-update' && event.newValue) {
                const data = JSON.parse(event.newValue);
                if (data.user === this.currentUser) {
                    this.wsHandler.requestActiveUsers();
                }
            }
        });
    }

    private notifyOtherTabs(): void {
        localStorage.setItem(
            'chat-update',
            JSON.stringify({
                user: this.currentUser,
                timestamp: Date.now(),
            })
        );
        localStorage.removeItem('chat-update');
    }

    private selectUser(username: string): void {
        this.selectedUser = username;

        if (this.sendButton) {
            this.sendButton.disabled = false;
        }

        const chatHeader: Element | null = this.container.querySelector('.chat-header label');
        if (chatHeader) {
            chatHeader.textContent = `Chat with ${username}`;
        }

        if (this.textarea) {
            this.textarea.disabled = false;
            this.textarea.focus();
        }

        if (this.chatContent) {
            this.chatContent.innerHTML = '';
            const spacer = document.createElement('div');
            spacer.classList.add('spacer');
            this.chatContent.appendChild(spacer);
        }
    }

    private handleLogout(): void {
        this.wsHandler.sendLogoutRequest(this.currentUser, this.userPassword);
    }

    private setupWebSocketHandlers(): void {
        this.wsHandler.setOnUsersUpdate((users: User[]) => {
            this.users = users;
            this.updateUserList();
        });

        this.wsHandler.setOnLogout((user: { login: string; isLogined: boolean }) => {
            if (user.login === this.currentUser && !user.isLogined) {
                this.onLogoutSuccess();
            }
        });

        this.wsHandler.setOnMessage((message) => {
            this.handleIncomingMessage(message);
            this.notifyOtherTabs();
        });
    }

    private handleIncomingMessage(messageData: {
        id: string | null;
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
    }): void {
        if (!this.chatContent || messageData.type !== 'MSG_SEND') return;

        const { message } = messageData.payload;
        const isForCurrentUser: boolean = message.to === this.currentUser;
        const isOurOwnMessage: boolean = message.from === this.currentUser;

        if (isForCurrentUser || isOurOwnMessage) {
            const isCurrentUser: boolean = message.from === this.currentUser;
            const existingMessage: Element | null = this.chatContent.querySelector(
                `[data-message-id="${message.id}"]`
            );

            if (existingMessage) {
                const statusElement: Element | null = existingMessage.querySelector('.message__status');
                if (statusElement) {
                    statusElement.textContent = message.status.isDelivered
                        ? message.status.isReaded
                            ? '👁✓'
                            : '✓'
                        : '🕒';
                    statusElement.className = `message__status ${
                        message.status.isDelivered
                            ? message.status.isReaded
                                ? 'message__status--read'
                                : ''
                            : 'message__status--sending'
                    }`;
                }
            } else {
                const messageOptions: IMessageOptions = {
                    text: message.text,
                    recipient: isCurrentUser ? message.to : message.from,
                    isCurrentUser,
                    status: message.status.isDelivered
                        ? message.status.isReaded
                            ? '👁✓'
                            : '✓'
                        : '🕒',
                    isEdited: message.status.isEdited,
                    datetime: message.datetime,
                    id: message.id,
                };

                this.addMessageToChat(messageOptions);
            }

            if (isForCurrentUser && !isOurOwnMessage) {
                this.selectUser(message.from);
            }
        }
    }

    private addMessageToChat(options: IMessageOptions): void {
        if (!this.chatContent) {
            console.error('chatContent is null!');
            return;
        }

        try {
            const message = new Message({
                ...options,
                currentUser: this.currentUser,
            });
            const messageElement: HTMLElement = message.render();

            this.chatContent.appendChild(messageElement);
            this.chatContent.scrollTop = this.chatContent.scrollHeight;
        } catch (error) {
            console.error(error);
        }
    }

    private updateUserList(): void {
        const userListElement: Element | null = this.container.querySelector('.user-list');
        if (!userListElement) return;

        userListElement.innerHTML = '';

        const filteredUsers: User[] = this.users.filter(
            (user: User): boolean | '' => user.login && user.login !== this.currentUser
        );

        filteredUsers.forEach((user: User): void => {
            const li: HTMLLIElement = document.createElement('li');
            li.classList.add('user-container');

            const status: HTMLDivElement = document.createElement('div');
            status.classList.add('user-status');
            status.classList.add(user.isOnline ? 'active' : 'inactive');

            const label: HTMLLabelElement = document.createElement('label');
            label.classList.add('user-login');
            label.textContent = user.login;

            label.addEventListener('click', () => {
                this.selectUser(user.login);
            });

            li.append(status, label);
            userListElement.append(li);
        });
    }

    render(): HTMLElement {
        const header: HTMLElement = this.createHeader();
        const content: HTMLElement = this.createContent();
        const footer: HTMLElement = this.createFooter();

        this.container.append(header, content, footer);
        return this.container;
    }

    private createHeader(): HTMLElement {
        const header: HTMLElement = document.createElement('section');
        header.classList.add('header');

        const contentWrapper: HTMLElement = document.createElement('article');
        contentWrapper.classList.add('content-wrapper');

        const userLabel: HTMLParagraphElement = document.createElement('p');
        userLabel.className = 'subheader';
        userLabel.textContent = `User: ${this.currentUser}`;

        const chatLabel: HTMLParagraphElement = document.createElement('p');
        chatLabel.className = 'subheader';
        chatLabel.textContent = 'Fun Chat';

        contentWrapper.append(userLabel, chatLabel);

        const infoButton: HTMLButtonElement = document.createElement('button');
        infoButton.type = 'button';
        infoButton.classList.add('button');
        infoButton.textContent = 'Info';
        infoButton.addEventListener('click', (): void => {
            sessionStorage.setItem('last-visited-path', '/main');
            window.location.hash = '#/info';
        });

        const exitButton: HTMLButtonElement  = document.createElement('button');
        exitButton.type = 'button';
        exitButton.classList.add('button');
        exitButton.textContent = 'Logout';
        exitButton.addEventListener('click', (): void => this.handleLogout());

        header.append(contentWrapper, infoButton, exitButton);
        return header;
    }

    private createContent(): HTMLElement {
        const content: HTMLElement = document.createElement('section');
        content.classList.add('content');

        const aside: HTMLElement = this.createContactsAside();
        const dialog: HTMLElement = this.createChat();

        content.append(aside, dialog);
        return content;
    }

    private createContactsAside(): HTMLElement {
        const aside: HTMLElement = document.createElement('aside');
        aside.classList.add('contacts');

        const searchInput: HTMLInputElement = document.createElement('input');
        searchInput.classList.add('search');
        searchInput.placeholder = 'Search...';

        const userList: HTMLUListElement = document.createElement('ul');
        userList.classList.add('user-list');

        aside.append(searchInput, userList);
        return aside;
    }

    private createChat(): HTMLElement {
        const article: HTMLElement = document.createElement('article');
        article.classList.add('chat-container');

        const header: HTMLElement = document.createElement('article');
        header.classList.add('chat-header');
        header.innerHTML = '<label></label>';

        this.chatContent = document.createElement('article');
        this.chatContent.classList.add('chat-content');

        const spacer: HTMLDivElement = document.createElement('div');
        spacer.classList.add('spacer');

        const infoLabel: HTMLLabelElement = document.createElement('label');
        infoLabel.classList.add('info-text');
        infoLabel.textContent = 'Choose user to send a message...';

        this.chatContent.append(spacer, infoLabel);

        const form: HTMLFormElement = document.createElement('form');
        form.classList.add('chat-input');
        form.addEventListener('submit', (e) => e.preventDefault());

        this.textarea = document.createElement('textarea');
        this.textarea.classList.add('chat-textarea');
        this.textarea.placeholder = 'Your message...';
        this.textarea.disabled = true;

        this.sendButton = document.createElement('button');
        this.sendButton.type = 'button';
        this.sendButton.classList.add('button');
        this.sendButton.textContent = 'Send';
        this.sendButton.disabled = true;

        this.sendButton.addEventListener('click', (): void => {
            this.sendMessage();
        });

        this.textarea.addEventListener('keydown', (e: KeyboardEvent): void => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        form.append(this.textarea, this.sendButton);
        article.append(header, this.chatContent, form);
        return article;
    }

    private sendMessage(): void {
        if (!this.selectedUser || !this.textarea || !this.textarea.value.trim()) {
            return;
        }

        const messageText: string = this.textarea.value.trim();
        if (!messageText) return;

        const message = {
            id: null,
            type: 'MSG_SEND',
            payload: {
                message: {
                    id: '',
                    from: this.currentUser,
                    to: this.selectedUser,
                    text: messageText,
                    datetime: Date.now(),
                    status: {
                        isDelivered: false,
                        isReaded: false,
                        isEdited: false,
                    },
                },
            },
        };

        this.wsHandler.sendMessage(message);
        this.textarea.value = '';
        this.notifyOtherTabs();
    }

    private createFooter(): HTMLElement {
        const footer: HTMLElement = document.createElement('section');
        footer.classList.add('footer');

        const rssLabel: HTMLAnchorElement = document.createElement('a');
        rssLabel.className = 'footer__link';
        rssLabel.textContent = 'RSSchool';
        rssLabel.href = 'https://rs.school/courses/javascript-ru';

        const link: HTMLAnchorElement = document.createElement('a');
        link.className = 'footer__link';
        link.href = 'https://github.com/blk-thorn';
        link.target = '_blank';
        link.textContent = 'Blk-thorn';

        const yearLabel: HTMLLabelElement = document.createElement('label');
        yearLabel.textContent = '2025';

        footer.append(rssLabel, link, yearLabel);
        return footer;
    }
}
