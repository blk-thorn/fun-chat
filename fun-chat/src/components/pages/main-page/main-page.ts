import './main-page.css'

export default class MainPage {
    private readonly container: HTMLElement;
    currentUser: string
    ws: WebSocket;

    constructor(id: string, currentUser: string, ws: WebSocket) {
        this.container = document.createElement('main');
        this.container.id = id;
        this.container.classList.add('main');
        this.currentUser = currentUser;
        this.ws = ws;

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
        userLabel.textContent = 'User: admin1';

        const chatLabel: HTMLElement  = document.createElement('p');
        userLabel.className = 'subheader';
        chatLabel.textContent = 'Fun Chat';

        contentWrapper.append(userLabel, chatLabel);

        const infoButton: HTMLButtonElement = document.createElement('button');
        infoButton.type = 'button';
        infoButton.classList.add('button');
        infoButton.textContent = 'Info';

        const exitButton: HTMLButtonElement = document.createElement('button');
        exitButton.type = 'button';
        exitButton.classList.add('button');
        exitButton.textContent = 'Logout';

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
        const aside: HTMLElement  = document.createElement('aside');
        aside.classList.add('contacts');

        const searchInput: HTMLInputElement  = document.createElement('input');
        searchInput.classList.add('search');
        searchInput.placeholder = 'Search...';

        const userList: HTMLElement  = document.createElement('ul');
        userList.classList.add('user-list');


        const users: string[] = [
            'user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', 'user10',
            'user11', 'user12', 'user13', 'user14', 'user15', 'user16', 'user17', 'user18', 'user19', 'user20',
            'user21', 'user22', 'user23', 'user24', 'user25', 'user26', 'user27', 'user28', 'user29', 'user30'
        ];

        users.forEach((user: string): void => {
            const li: HTMLElement = document.createElement('li');
            li.classList.add('user-container');

            const status: HTMLElement = document.createElement('div');
            status.classList.add('user-status');

            if (users.indexOf(user) < 10) {
                status.classList.add('active');
            }

            const label: HTMLElement = document.createElement('label');
            label.classList.add('user-login');
            label.textContent = user;

            li.append(status, label);
            userList.append(li);
        });

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

        const rssLabel: HTMLElement = document.createElement('label');
        rssLabel.textContent = 'RSSchool';

        const link: HTMLAnchorElement = document.createElement('a');
        link.href = 'https://github.com/blk-thorn';
        link.target = '_blank';
        link.textContent = 'Blk-thorn';

        const yearLabel: HTMLElement = document.createElement('label');
        yearLabel.textContent = '2025';

        footer.append(rssLabel, link, yearLabel);
        return footer;
    }
}
