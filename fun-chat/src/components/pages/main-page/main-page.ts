import './main-page.css'
import MainWebsocket from '../main-page/main-websocket';

export default class MainPage {
    private readonly container: HTMLElement;
    currentUser: string;
    private wsHandler: MainWebsocket;
    private users: string[] = [];
    userPassword: string;
    private readonly onLogoutSuccess: () => void;

    constructor(id: string, currentUser: string, userPassword: string, ws: WebSocket, onLogoutSuccess: () => void) {
        console.log('MainPage constructor credentials:', { currentUser, userPassword });
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

    private handleLogout(): void {
        if (confirm('Are you sure you want to logout?')) {
            this.wsHandler.sendLogoutRequest(this.currentUser, this.userPassword);
        }
    }

    private setupWebSocketHandlers(): void {
        this.wsHandler.setOnUsersUpdate((users: string[]) => {
            this.users = users;
            this.updateUserList();
        });
        this.wsHandler.setOnLogout((user) => {
            if (user.login === this.currentUser && !user.isLogined) {
                this.onLogoutSuccess();
            }
        });
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
            window.dispatchEvent(new CustomEvent('navigate', { detail: '/info' }));
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

        const content: HTMLElement = document.createElement('article');
        content.classList.add('chat-content');

        const spacer: HTMLElement = document.createElement('div');
        spacer.classList.add('spacer');

        const infoLabel: HTMLElement = document.createElement('label');
        infoLabel.classList.add('info-text');
        infoLabel.textContent = 'Choose user to send a message...';

        content.append(spacer, infoLabel);

        const form: HTMLElement = document.createElement('form');
        form.classList.add('chat-input');

        const textarea: HTMLTextAreaElement = document.createElement('textarea');
        textarea.classList.add('chat-textarea');
        textarea.placeholder = 'Your message...';
        textarea.disabled = true;

        const button: HTMLButtonElement = document.createElement('button');
        button.type = 'button';
        button.classList.add('button');
        button.textContent = 'Send';
        button.disabled = true;

        form.append(textarea, button);

        article.append(header, content, form);
        return article;
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
