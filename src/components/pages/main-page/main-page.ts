import './main-page.css';
import MainWebsocket from '../main-page/main-websocket';
import type { IMessageOptions } from '~/types/types';
import Message from '../../../message/message';
import type User from '../../../types/types';

interface ChatTab {
    userId: string;
    messages: IMessageOptions[];
    unreadCount: number;
    isOpen: boolean;
}

interface MessageStatus {
    isDelivered: boolean;
    isReaded: boolean;
    isEdited: boolean;
}

export default class MainPage {
    private readonly container: HTMLElement;
    currentUser: string;
    private wsHandler: MainWebsocket;
    userPassword: string;
    private readonly onLogoutSuccess: () => void;
    private selectedUserId: string | null = null;
    private lastSelectedUser: string | null = null;
    private chatTabs: Map<string, ChatTab> = new Map();
    private messageInstances: Map<string, Message> = new Map();
    private textarea: HTMLTextAreaElement | null = null;
    private sendButton: HTMLButtonElement | null = null;
    private chatContent: HTMLElement | null = null;
    private infoLabel: HTMLElement | null = null;
    private pendingReadReceipts: Set<string> = new Set();
    private messagePollingInterval: number | null = null;
    private allUsersHistoryLoaded: boolean = false;

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

        this.lastSelectedUser = sessionStorage.getItem('lastSelectedUser');

        this.setupWebSocketHandlers();
        this.setupTabSync();
        this.loadChatHistoryFromStorage();

        this.requestActiveUsers();

        this.startMessagePolling();
    }

    private startMessagePolling(): void {
        if (this.messagePollingInterval) {
            clearInterval(this.messagePollingInterval);
        }

        this.messagePollingInterval = window.setInterval(() => {
            this.pollForNewMessages();
        }, 30000);

        setTimeout(() => {
            this.pollForNewMessages();
        }, 2000);
    }

    private pollForNewMessages(): void {
        if (!this.allUsersHistoryLoaded) {
            this.requestMessageHistory();
        }

        for (const userId of this.chatTabs.keys()) {
            if (userId !== this.currentUser) {
                this.requestMessageHistory(userId);
            }
        }
    }

    public requestActiveUsers(): void {
        this.wsHandler.requestActiveUsers();
    }

    public requestMessageHistory(userId?: string): void {
        this.wsHandler.requestMessageHistory(userId);
    }

    private setupTabSync(): void {
        window.addEventListener('focus', () => {
            this.requestActiveUsers();
        });

        window.addEventListener('storage', (event) => {
            if (event.key === 'chat-update' && event.newValue) {
                const data = JSON.parse(event.newValue);
                if (data.user === this.currentUser) {
                    this.requestActiveUsers();
                }
            }
        });

        window.addEventListener('beforeunload', () => {
            this.saveChatHistoryToStorage();
        });
    }

    private saveChatHistoryToStorage(): void {
        const history: Record<string, ChatTab> = {};
        this.chatTabs.forEach((tab, userId) => {
            history[userId] = {
                userId: tab.userId,
                messages: tab.messages.map(msg => ({
                    ...msg,
                    status: typeof msg.status === 'object'
                        ? { ...msg.status }
                        : msg.status
                })),
                unreadCount: tab.unreadCount,
                isOpen: tab.isOpen
            };
        });
        localStorage.setItem(`chatHistory_${this.currentUser}`, JSON.stringify(history));
    }

    private loadChatHistoryFromStorage(): void {
        const saved = localStorage.getItem(`chatHistory_${this.currentUser}`);
        if (saved) {
            try {
                const history: Record<string, ChatTab> = JSON.parse(saved);
                Object.entries(history).forEach(([userId, tabData]) => {
                    const messages = tabData.messages.map(msg => ({
                        ...msg,
                        status: msg.status && typeof msg.status === 'object'
                            ? {
                                isDelivered: msg.status.isDelivered || false,
                                isReaded: msg.status.isReaded || false,
                                isEdited: msg.status.isEdited || false
                            }
                            : msg.status
                    }));

                    if (!this.chatTabs.has(userId)) {
                        this.chatTabs.set(userId, {
                            userId: tabData.userId,
                            messages: messages,
                            unreadCount: tabData.unreadCount,
                            isOpen: tabData.isOpen
                        });
                    } else {
                        const existingTab = this.chatTabs.get(userId)!;
                        const existingMessageIds = new Set(existingTab.messages.map(m => m.id));

                        messages.forEach(msg => {
                            if (!existingMessageIds.has(msg.id)) {
                                existingTab.messages.push(msg);
                            }
                        });
                    }
                });
            } catch (e) {
                console.error('Failed to load chat history:', e);
            }
        }
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

    private selectUser(userId: string): void {
        if (this.selectedUserId === userId) return;

        const previousSelectedUser = this.selectedUserId;
        this.selectedUserId = userId;

        sessionStorage.setItem('lastSelectedUser', userId);

        const userListElement: Element | null = this.container.querySelector('.user-list');
        if (userListElement) {
            const allUserItems = userListElement.querySelectorAll('.user-container');
            allUserItems.forEach(item => item.classList.remove('selected'));

            const selectedUserItem = userListElement.querySelector(`[data-user-id="${userId}"]`);
            if (selectedUserItem) selectedUserItem.classList.add('selected');
        }

        const chatHeader: Element | null = this.container.querySelector('.chat-header label');
        if (chatHeader) chatHeader.textContent = `Chat with ${userId}`;

        if (this.sendButton) this.sendButton.disabled = false;
        if (this.textarea) {
            this.textarea.disabled = false;
            this.textarea.focus();
        }

        this.renderMessagesForUser(userId);

        this.requestMessageHistory(userId);

        const tab = this.chatTabs.get(userId);
        if (tab) {
            tab.unreadCount = 0;
            tab.isOpen = true;
            this.updateUserBadge(userId);
            this.markMessagesAsRead(userId);
        }

        if (previousSelectedUser) {
            const previousTab = this.chatTabs.get(previousSelectedUser);
            if (previousTab) previousTab.isOpen = false;
        }

        this.saveChatHistoryToStorage();
    }

    private isMessageStatusObject(status: any): status is MessageStatus {
        return status &&
            typeof status === 'object' &&
            'isDelivered' in status &&
            'isReaded' in status &&
            'isEdited' in status;
    }

    private markMessagesAsRead(userId: string): void {
        const tab = this.chatTabs.get(userId);
        if (!tab) return;

        tab.messages.forEach(msg => {
            if (!msg.isCurrentUser && msg.id) {
                if (this.isMessageStatusObject(msg.status)) {
                    if (!msg.status.isReaded && !this.pendingReadReceipts.has(msg.id)) {
                        this.sendReadReceipt(msg.id);
                        this.pendingReadReceipts.add(msg.id);
                    }
                } else if (typeof msg.status === 'string' && msg.status !== '👁✓') {
                    if (!this.pendingReadReceipts.has(msg.id)) {
                        this.sendReadReceipt(msg.id);
                        this.pendingReadReceipts.add(msg.id);
                    }
                }
            }
        });
    }

    private sendReadReceipt(messageId: string): void {
        const readReceipt = {
            id: `read_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'MSG_READ',
            payload: {
                message: {
                    id: messageId
                }
            }
        };
        this.wsHandler.sendMessage(readReceipt);
    }

    private hideNoMessagesLabel(): void {
        if (this.infoLabel && this.infoLabel.parentElement) {
            this.infoLabel.style.display = 'none';
        }
    }

    private showNoMessagesLabel(): void {
        if (!this.chatContent) return;

        if (!this.infoLabel) {
            const spacer = document.createElement('div');
            spacer.classList.add('spacer');

            this.infoLabel = document.createElement('label');
            this.infoLabel.classList.add('info-text');
            this.infoLabel.textContent = 'No messages yet. Start a conversation!';

            this.chatContent.append(spacer, this.infoLabel);
        }

        this.infoLabel.style.display = 'block';
    }

    private renderMessagesForUser(userId: string): void {
        if (!this.chatContent) return;

        this.chatContent.innerHTML = '';
        this.messageInstances.clear();
        this.infoLabel = null;

        const tab = this.chatTabs.get(userId);
        if (!tab || tab.messages.length === 0) {
            this.showNoMessagesLabel();
        } else {
            tab.messages.sort((a, b) => {
                const timeA = a.datetime ? new Date(a.datetime).getTime() : 0;
                const timeB = b.datetime ? new Date(b.datetime).getTime() : 0;
                return timeA - timeB;
            });

            tab.messages.forEach(message => this.addMessageElementToChat(message));
            this.chatContent.scrollTop = this.chatContent.scrollHeight;
            this.hideNoMessagesLabel();
        }
    }

    private updateUserBadge(userId: string): void {
        const userListElement: Element | null = this.container.querySelector('.user-list');
        if (!userListElement) return;

        const userItem = userListElement.querySelector(`[data-user-id="${userId}"]`);
        const tab = this.chatTabs.get(userId);
        if (userItem && tab) {
            const badge = userItem.querySelector('.user-badge');
            if (badge) {
                if (tab.unreadCount > 0) {
                    badge.textContent = tab.unreadCount.toString();
                    badge.classList.add('has-unread');
                } else {
                    badge.textContent = '';
                    badge.classList.remove('has-unread');
                }
            }
        }
    }

    private handleLogout(): void {
        this.saveChatHistoryToStorage();
        this.wsHandler.sendLogoutRequest(this.currentUser, this.userPassword);
        sessionStorage.removeItem('isAuthenticated');
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('lastSelectedUser');
        localStorage.removeItem(`chatHistory_${this.currentUser}`);
        this.onLogoutSuccess();
    }

    private setupWebSocketHandlers(): void {
        this.wsHandler.setOnUsersUpdate((users: User[]) => {
            this.updateUserList(users);
        });

        this.wsHandler.setOnLogout((user) => {
            if (user.login === this.currentUser) {
                sessionStorage.removeItem('isAuthenticated');
                sessionStorage.removeItem('currentUser');
                this.onLogoutSuccess();
            }
        });

        this.wsHandler.setOnExternalLogout((userLogin: string) => {
            this.markUserAsInactive(userLogin);
        });

        this.wsHandler.setOnMessage((message) => {
            this.handleIncomingMessage(message);
            this.notifyOtherTabs();
            this.saveChatHistoryToStorage();
        });

        this.wsHandler.setOnMessageHistory((messages: any[]) => {
            if (messages.length === 0) {
                if (!this.allUsersHistoryLoaded) {
                    this.allUsersHistoryLoaded = true;
                }
                return;
            }

            let hasNewMessages = false;

            messages.forEach(msgData => {
                if (!msgData || !msgData.id || !msgData.text) return;

                const isOurOwnMessage = msgData.from === this.currentUser;
                const otherUserId = isOurOwnMessage ? msgData.to : msgData.from;

                let tab = this.chatTabs.get(otherUserId);
                if (!tab) {
                    tab = { userId: otherUserId, messages: [], unreadCount: 0, isOpen: false };
                    this.chatTabs.set(otherUserId, tab);
                }

                const messageOptions: IMessageOptions = {
                    text: msgData.text,
                    datetime: msgData.datetime || Date.now(),
                    recipient: msgData.to,
                    isCurrentUser: isOurOwnMessage,
                    status: msgData.status || {
                        isDelivered: true,
                        isReaded: false,
                        isEdited: false
                    },
                    isEdited: msgData.status?.isEdited || false,
                    id: msgData.id,
                    senderName: msgData.from,
                    currentUser: this.currentUser
                };

                const existingMessage = tab.messages.find(m => m.id === msgData.id);
                if (!existingMessage) {
                    tab.messages.push(messageOptions);
                    hasNewMessages = true;

                    if (!isOurOwnMessage && msgData.to === this.currentUser) {
                        if (this.selectedUserId === otherUserId) {
                            this.addMessageElementToChat(messageOptions);
                            this.markMessagesAsRead(otherUserId);
                        } else {
                            tab.unreadCount++;
                            this.updateUserBadge(otherUserId);
                        }
                    } else if (isOurOwnMessage) {
                        if (this.selectedUserId === otherUserId) {
                            this.addMessageElementToChat(messageOptions);
                        }
                    }
                }
            });

            if (hasNewMessages) {
                this.saveChatHistoryToStorage();

                if (this.chatContent && this.selectedUserId) {
                    setTimeout(() => {
                        if (this.chatContent) {
                            this.chatContent.scrollTop = this.chatContent.scrollHeight;
                        }
                    }, 100);
                }
            }
        });

        this.wsHandler.setOnMessageStatusUpdate((update) => {
            const { messageId, status } = update;

            this.pendingReadReceipts.delete(messageId);

            for (const tab of this.chatTabs.values()) {
                const msg = tab.messages.find(m => m.id === messageId);
                if (msg) {
                    msg.status = status;
                    if (this.isMessageStatusObject(status)) {
                        msg.isEdited = status.isEdited || false;
                    }
                    this.updateMessageStatus(messageId, status);
                    break;
                }
            }
            this.saveChatHistoryToStorage();
        });
    }

    private markUserAsInactive(userLogin: string): void {
        const userListElement: Element | null = this.container.querySelector('.user-list');
        if (!userListElement) return;

        const userItem = userListElement.querySelector(`[data-user-id="${userLogin}"]`);
        if (userItem) {
            const statusElement = userItem.querySelector('.user-status');
            if (statusElement) {
                statusElement.className = 'user-status inactive';
            }

            if (this.selectedUserId === userLogin) {
                this.selectedUserId = null;
                if (this.chatContent) {
                    this.chatContent.innerHTML = '';
                    const spacer = document.createElement('div');
                    spacer.classList.add('spacer');
                    const infoLabel = document.createElement('label');
                    infoLabel.classList.add('info-text');
                    infoLabel.textContent = 'Select a user to chat';
                    this.chatContent.append(spacer, infoLabel);
                }

                if (this.sendButton) this.sendButton.disabled = true;
                if (this.textarea) {
                    this.textarea.disabled = true;
                    this.textarea.value = '';
                }

                const chatHeader: Element | null = this.container.querySelector('.chat-header label');
                if (chatHeader) chatHeader.textContent = 'Select a user to chat';
            }

            this.groupActiveAndInactiveUsers(userListElement);
        } else {
            this.createUserListItem(
                { login: userLogin, isOnline: false } as User,
                userListElement,
                false
            );
            this.groupActiveAndInactiveUsers(userListElement);
        }
    }

    private handleIncomingMessage(messageData: any): void {
        if (!this.chatContent) return;

        if (['MSG_SEND', 'MSG_5END'].includes(messageData.type)) {
            const { message } = messageData.payload;
            const isOurOwnMessage = message.from === this.currentUser;
            const otherUserId = isOurOwnMessage ? message.to : message.from;

            if (message.to === this.currentUser || message.from === this.currentUser) {
                let tab = this.chatTabs.get(otherUserId);
                if (!tab) {
                    tab = { userId: otherUserId, messages: [], unreadCount: 0, isOpen: false };
                    this.chatTabs.set(otherUserId, tab);
                }

                const existingMessage = tab.messages.find(m => m.id === message.id);
                if (existingMessage) return;

                const messageOptions: IMessageOptions = {
                    text: message.text,
                    datetime: message.datetime,
                    recipient: message.to,
                    isCurrentUser: isOurOwnMessage,
                    status: message.status,
                    isEdited: message.status?.isEdited || false,
                    id: message.id,
                    senderName: message.from,
                    currentUser: this.currentUser
                };

                tab.messages.push(messageOptions);

                if (!isOurOwnMessage) {
                    if (this.selectedUserId === otherUserId) {
                        this.addMessageElementToChat(messageOptions);
                        this.hideNoMessagesLabel();
                        this.markMessagesAsRead(otherUserId);
                    } else {
                        tab.unreadCount++;
                        this.updateUserBadge(otherUserId);
                    }
                } else {
                    if (this.selectedUserId === otherUserId) {
                        this.addMessageElementToChat(messageOptions);
                        this.hideNoMessagesLabel();
                    }
                }
            }
        }
    }

    private addMessageElementToChat(options: IMessageOptions): void {
        if (!this.chatContent) return;

        let messageInstance: Message;
        if (this.messageInstances.has(options.id)) {
            messageInstance = this.messageInstances.get(options.id)!;
            if (options.status) {
                if (this.isMessageStatusObject(options.status)) {
                    messageInstance.updateStatus({ messageId: options.id, status: options.status });
                }
            }
        } else {
            messageInstance = new Message(options);
            this.messageInstances.set(options.id, messageInstance);
            const messageElement = messageInstance.render();
            if (options.isCurrentUser) messageElement.classList.add('message--own');
            this.chatContent.appendChild(messageElement);
            this.chatContent.scrollTop = this.chatContent.scrollHeight;
        }

        this.hideNoMessagesLabel();
    }

    private updateMessageStatus(messageId: string, status: any): void {
        const messageInstance = this.messageInstances.get(messageId);
        if (messageInstance) {
            messageInstance.updateStatus({ messageId, status });
        }

        this.updateMessageStatusVisual(messageId, status);
    }

    private updateMessageStatusVisual(messageId: string, status: any): void {
        const messageElement = this.container.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageElement) return;

        const statusElement = messageElement.querySelector('.message__status');
        if (statusElement) {
            if (this.isMessageStatusObject(status)) {
                if (status.isReaded) {
                    statusElement.textContent = '👁✓';
                    statusElement.className = 'message__status message__status--read';
                } else if (status.isDelivered) {
                    statusElement.textContent = '✓✓';
                    statusElement.className = 'message__status';
                } else {
                    statusElement.textContent = '🕒';
                    statusElement.className = 'message__status message__status--sending';
                }
            }
        }
    }

    private updateUserList(users: User[]): void {
        const userListElement: Element | null = this.container.querySelector('.user-list');
        if (!userListElement) return;

        const activeUsersMap = new Map<string, User>();
        users.forEach(user => {
            if (user.login && user.login !== this.currentUser) {
                activeUsersMap.set(user.login, { ...user, isOnline: true });
            }
        });

        const currentUserElements = userListElement.querySelectorAll('.user-container');
        const currentUsersMap = new Map<string, HTMLLIElement>();

        currentUserElements.forEach(element => {
            const userId = element.getAttribute('data-user-id');
            if (userId) {
                currentUsersMap.set(userId, element as HTMLLIElement);
            }
        });

        for (const [userId, element] of currentUsersMap) {
            if (activeUsersMap.has(userId)) {
                const statusElement = element.querySelector('.user-status');
                if (statusElement) statusElement.className = 'user-status active';
            } else {
                const statusElement = element.querySelector('.user-status');
                if (statusElement) statusElement.className = 'user-status inactive';
            }
        }

        for (const [userId, user] of activeUsersMap) {
            if (!currentUsersMap.has(userId)) {
                this.createUserListItem(user, userListElement, true);
            }
        }

        const currentItems = userListElement.querySelectorAll('.user-container');
        const noUsersElement = userListElement.querySelector('.no-users');

        if (currentItems.length === 0 && !noUsersElement) {
            const noUsers = document.createElement('li');
            noUsers.classList.add('no-users');
            noUsers.textContent = 'No other users';
            userListElement.appendChild(noUsers);
        } else if (currentItems.length > 0 && noUsersElement) {
            noUsersElement.remove();
        }

        this.groupActiveAndInactiveUsers(userListElement);

        if (this.lastSelectedUser && this.selectedUserId === null) {
            if (!userListElement.querySelector(`[data-user-id="${this.lastSelectedUser}"]`)) {
                this.createUserListItem({ login: this.lastSelectedUser, isOnline: false } as User, userListElement, false);
                this.groupActiveAndInactiveUsers(userListElement);
            }
            this.selectUser(this.lastSelectedUser);
        }
    }

    private groupActiveAndInactiveUsers(userListElement: Element): void {
        const allUsers = Array.from(userListElement.querySelectorAll('.user-container'));

        const activeUsers = allUsers.filter(item => item.querySelector('.user-status.active'));
        const inactiveUsers = allUsers.filter(item => item.querySelector('.user-status.inactive'));

        const existingDivider = userListElement.querySelector('.user-list-divider');
        if (existingDivider) existingDivider.remove();

        userListElement.innerHTML = '';

        activeUsers.forEach(user => userListElement.appendChild(user));

        if (activeUsers.length > 0 && inactiveUsers.length > 0) {
            const divider = document.createElement('li');
            divider.classList.add('user-list-divider');
            userListElement.appendChild(divider);
        }

        inactiveUsers.forEach(user => userListElement.appendChild(user));
    }

    private createUserListItem(user: User, userListElement: Element, isActive: boolean): void {
        const li: HTMLLIElement = document.createElement('li');
        li.classList.add('user-container');
        li.setAttribute('data-user-id', user.login || '');

        const status: HTMLDivElement = document.createElement('div');
        status.classList.add('user-status', isActive ? 'active' : 'inactive');

        const labelContainer = document.createElement('div');
        labelContainer.classList.add('user-label-container');

        const label: HTMLLabelElement = document.createElement('label');
        label.classList.add('user-login');
        label.textContent = user.login || '';

        const badge: HTMLSpanElement = document.createElement('span');
        badge.classList.add('user-badge');
        badge.setAttribute('data-user-id', user.login || '');

        labelContainer.append(label, badge);
        li.append(status, labelContainer);

        li.addEventListener('click', () => this.selectUser(user.login || ''));

        userListElement.append(li);

        const tab = this.chatTabs.get(user.login || '');
        if (tab) this.updateUserBadge(user.login || '');
    }

    render(): HTMLElement {
        const header = this.createHeader();
        const content = this.createContent();
        const footer = this.createFooter();
        this.container.append(header, content, footer);
        return this.container;
    }

    private createHeader(): HTMLElement {
        const header = document.createElement('section');
        header.classList.add('header');

        const contentWrapper = document.createElement('article');
        contentWrapper.classList.add('content-wrapper');

        const userLabel = document.createElement('p');
        userLabel.className = 'subheader';
        userLabel.textContent = `User: ${this.currentUser}`;

        const chatLabel = document.createElement('p');
        chatLabel.className = 'subheader';
        chatLabel.textContent = 'Fun Chat';

        contentWrapper.append(userLabel, chatLabel);

        const infoButton = document.createElement('button');
        infoButton.type = 'button';
        infoButton.classList.add('button');
        infoButton.textContent = 'Info';
        infoButton.addEventListener('click', () => {
            sessionStorage.setItem('last-visited-path', '/main');
            window.location.hash = '#/info';
        });

        const exitButton = document.createElement('button');
        exitButton.type = 'button';
        exitButton.classList.add('button');
        exitButton.textContent = 'Logout';
        exitButton.addEventListener('click', () => this.handleLogout());

        header.append(contentWrapper, infoButton, exitButton);
        return header;
    }

    private createContent(): HTMLElement {
        const content = document.createElement('section');
        content.classList.add('content');
        const aside = this.createContactsAside();
        const dialog = this.createChat();
        content.append(aside, dialog);
        return content;
    }

    private createContactsAside(): HTMLElement {
        const aside = document.createElement('aside');
        aside.classList.add('contacts');

        const searchInput = document.createElement('input');
        searchInput.classList.add('search');
        searchInput.placeholder = 'Search...';

        const userList = document.createElement('ul');
        userList.classList.add('user-list');

        aside.append(searchInput, userList);
        return aside;
    }

    private createChat(): HTMLElement {
        const article = document.createElement('article');
        article.classList.add('chat-container');

        const header = document.createElement('article');
        header.classList.add('chat-header');
        const chatTitle = document.createElement('label');
        chatTitle.textContent = 'Select a user to chat';
        header.appendChild(chatTitle);

        this.chatContent = document.createElement('article');
        this.chatContent.classList.add('chat-content');

        const form = document.createElement('form');
        form.classList.add('chat-input');
        form.addEventListener('submit', e => e.preventDefault());

        this.textarea = document.createElement('textarea');
        this.textarea.classList.add('chat-textarea');
        this.textarea.placeholder = 'Your message...';
        this.textarea.disabled = true;

        this.sendButton = document.createElement('button');
        this.sendButton.type = 'button';
        this.sendButton.classList.add('button');
        this.sendButton.textContent = 'Send';
        this.sendButton.disabled = true;

        this.sendButton.addEventListener('click', () => this.sendMessage());
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
        if (!this.selectedUserId || !this.textarea || !this.textarea.value.trim()) return;

        const messageText = this.textarea.value.trim();
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const message = {
            id: null,
            type: 'MSG_SEND',
            payload: {
                message: {
                    id: messageId,
                    from: this.currentUser,
                    to: this.selectedUserId,
                    text: messageText,
                    datetime: Date.now(),
                    status: { isDelivered: false, isReaded: false, isEdited: false }
                }
            }
        };

        this.wsHandler.sendMessage(message);
        this.textarea.value = '';
        this.notifyOtherTabs();
        this.saveChatHistoryToStorage();
    }

    private createFooter(): HTMLElement {
        const footer = document.createElement('section');
        footer.classList.add('footer');

        const rssLabel = document.createElement('a');
        rssLabel.className = 'footer__link';
        rssLabel.textContent = 'RSSchool';
        rssLabel.href = 'https://rs.school/courses/javascript-ru';

        const link = document.createElement('a');
        link.className = 'footer__link';
        link.href = 'https://github.com/blk-thorn';
        link.target = '_blank';
        link.textContent = 'Blk-thorn';

        const yearLabel = document.createElement('label');
        yearLabel.textContent = '2025';

        footer.append(rssLabel, link, yearLabel);
        return footer;
    }

    public destroy(): void {
        this.saveChatHistoryToStorage();

        if (this.messagePollingInterval) {
            clearInterval(this.messagePollingInterval);
            this.messagePollingInterval = null;
        }

        if (this.wsHandler) {
            this.wsHandler.destroy();
        }
        this.container.innerHTML = '';
    }
}
