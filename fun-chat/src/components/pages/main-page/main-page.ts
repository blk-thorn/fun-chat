import './main-page.css'
import MainWebsocket from '../main-page/main-websocket';
import type IMessageOptions from '../../../types/types';
import Message from '../../../message/message';


export default class MainPage {
    private readonly container: HTMLElement;
    currentUser: string;
    private wsHandler: MainWebsocket;
    private users: string[] = [];
    userPassword: string;
    private readonly onLogoutSuccess: () => void;
    private selectedUser: string | null = null;
    private textarea: HTMLTextAreaElement | null  = null;
    private sendButton: HTMLButtonElement| null  = null;
    private chatContent: HTMLElement | null = null;


    constructor(id: string, currentUser: string, userPassword: string, ws: WebSocket, onLogoutSuccess: () => void) {
        this.container = document.createElement('main');
        this.container.id = id;
        this.container.classList.add('main');
        this.currentUser = currentUser;
        this.wsHandler = new MainWebsocket(ws);
        this.userPassword = userPassword;
        this.onLogoutSuccess = onLogoutSuccess;

        this.setupWebSocketHandlers();
        this.wsHandler.requestActiveUsers();
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
            const spacer: HTMLDivElement = document.createElement('div');
            spacer.classList.add('spacer');
            this.chatContent.appendChild(spacer);
        }
    }


    private handleLogout(): void {
        if (confirm('Are you sure you want to logout?')) {
            this.wsHandler.sendLogoutRequest(this.currentUser, this.userPassword);
        }
    }

    private setupWebSocketHandlers(): void {
        this.wsHandler.setOnUsersUpdate((users: string[]): void => {
            this.users = users;
            this.updateUserList();
        });
        this.wsHandler.setOnLogout((user): void => {
            if (user.login === this.currentUser && !user.isLogined) {
                this.onLogoutSuccess();
            }
        });

        this.wsHandler.setOnMessage((message): void => {
            this.handleIncomingMessage(message);
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
        if (!this.chatContent || messageData.type !== "MSG_SEND") return;

        const { from, to, text, status } = messageData.payload.message;
        const isCurrentUser: boolean = from === this.currentUser;

        const messageOptions: IMessageOptions = {
            text,
            recipient: isCurrentUser ? to : from,
            isCurrentUser,
            status: status.isDelivered ? (status.isReaded ? '👁✓' : '✓') : '🕒',
            isEdited: status.isEdited,
            datetime: messageData.payload.message.datetime
        };

        this.addMessageToChat(messageOptions);
    }

    private addMessageToChat(options: IMessageOptions): void {
        console.log('Adding message to chat:', options);

        if (!this.chatContent) {
            console.error('chatContent is null!');
            return;
        }

        try {
            const message = new Message(options);
            const messageElement:HTMLElement = message.render();
            console.log('Created message element:', messageElement);

            this.chatContent.appendChild(messageElement);
            this.chatContent.scrollTop = this.chatContent.scrollHeight;

            console.log('Message added successfully');
        } catch (error) {
            console.error('Error adding message to chat:', error);
        }
    }

    private updateUserList(): void {
        const userListElement: Element | null = this.container.querySelector('.user-list');
        if (!userListElement) return;

        userListElement.innerHTML = '';

        this.users.forEach((user: any): void => {
            const li: HTMLElement = document.createElement('li');
            li.classList.add('user-container');

            const status: HTMLElement = document.createElement('div');
            status.classList.add('user-status');
            status.classList.add('active');

            const label: HTMLElement = document.createElement('label');
            label.classList.add('user-login');
            label.textContent = user.login;

            label.addEventListener('click', (): void => {
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

        this.container.append(header);
        this.container.append(content);
        this.container.append(footer);

        return this.container;
    }

    private createHeader(): HTMLElement  {
        const header: HTMLElement  = document.createElement('section');
        header.classList.add('header');

        const contentWrapper: HTMLElement  = document.createElement('article');
        contentWrapper.classList.add('content-wrapper');

        const userLabel: HTMLElement  = document.createElement('p');
        userLabel.className = 'subheader';
        userLabel.textContent = `User: ${this.currentUser}`;

        const chatLabel: HTMLElement  = document.createElement('p');
        userLabel.className = 'subheader';
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


        const exitButton: HTMLButtonElement = document.createElement('button');
        exitButton.type = 'button';
        exitButton.classList.add('button');
        exitButton.textContent = 'Logout';
        exitButton.addEventListener('click', (): void => this.handleLogout());

        header.append(contentWrapper, infoButton, exitButton);
        return header;
    }

    private createContent(): HTMLElement  {
        const content: HTMLElement  = document.createElement('section');
        content.classList.add('content');

        const aside: HTMLElement  = this.createContactsAside();
        const dialog: HTMLElement  = this.createChat();

        content.append(aside, dialog);
        return content;
    }

    private createContactsAside(): HTMLElement {
        const aside: HTMLElement = document.createElement('aside');
        aside.classList.add('contacts');

        const searchInput: HTMLInputElement = document.createElement('input');
        searchInput.classList.add('search');
        searchInput.placeholder = 'Search...';

        const userList: HTMLElement = document.createElement('ul');
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

        const spacer: HTMLElement = document.createElement('div');
        spacer.classList.add('spacer');

        const infoLabel: HTMLElement = document.createElement('label');
        infoLabel.classList.add('info-text');
        infoLabel.textContent = 'Choose user to send a message...';

        this.chatContent.append(spacer, infoLabel);

        const form: HTMLElement = document.createElement('form');
        form.classList.add('chat-input');

        this.textarea = document.createElement('textarea');
        this.textarea.classList.add('chat-textarea');
        this.textarea.placeholder = 'Your message...';
        this.textarea.disabled = true;

        this.sendButton = document.createElement('button');
        this.sendButton.type = 'button';
        this.sendButton.classList.add('button');
        this.sendButton.textContent = 'Send';
        this.sendButton.disabled = true;

        this.sendButton.addEventListener('click', () => {
            this.sendMessage();
        });

        this.textarea.addEventListener('keydown', (e) => {
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

        const messageOptions: IMessageOptions = {
            text: messageText,
            recipient: this.selectedUser,
            isCurrentUser: true,
            status: '🕒',
            datetime: Date.now()
        };

        this.addMessageToChat(messageOptions);

        const message = {
            id: null,
            type: "MSG_SEND",
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
                        isEdited: false
                    }
                }
            }
        };

        this.wsHandler.sendMessage(message);

        this.textarea.value = '';
    }

    private createFooter(): HTMLElement {
        const footer: HTMLElement = document.createElement('section');
        footer.classList.add('footer');

        const rssLabel: HTMLAnchorElement = document.createElement('a');
        rssLabel.className = 'footer__link';
        rssLabel.textContent = 'RSSchool';
        rssLabel.href = 'https://rs.school/courses/javascript-ru'

        const link: HTMLAnchorElement = document.createElement('a');
        link.className = 'footer__link';
        link.href = 'https://github.com/blk-thorn';
        link.target = '_blank';
        link.textContent = 'Blk-thorn';

        const yearLabel: HTMLElement = document.createElement('label');
        yearLabel.textContent = '2025';

        footer.append(rssLabel, link, yearLabel);
        return footer;
    }
}
