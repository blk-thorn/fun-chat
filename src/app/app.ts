import AuthWebsocket from '../pages/auth-page/auth-websocket';
import MainPage from '../pages/main-page/main-page';
import InfoPage from '../pages/info-page/info-page';
import Router from '../router/router';

export default class App {
    private readonly mainElement: HTMLElement;
    public authPage: AuthWebsocket | null = null;
    private mainPage: MainPage | null = null;
    private readonly ws: WebSocket;
    public router: Router;

    constructor() {
        this.mainElement = this.createMainElement();
        document.body.append(this.mainElement);
        this.ws = new WebSocket('ws://localhost:4000');

        this.router = new Router(this.mainElement);
        this.setupRoutes();
        this.handleInitialRoute();
    }

    private handleInitialRoute(): void {
        const hash = window.location.hash.substring(1) || '/auth';

        const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
        const currentUser = sessionStorage.getItem('currentUser');
        const userPassword = sessionStorage.getItem('userPassword');

        if (hash === '/auth') {
            this.router.navigate('/auth', false);
        } else if (hash === '/info') {
            this.router.navigate('/info', false);
        } else if (hash === '/main') {
            if (isAuthenticated && currentUser && userPassword) {
                this.router.navigate('/main', false);
            } else {
                window.location.hash = '#/auth';
            }
        } else {
            window.location.hash = '#/auth';
        }
    }

    private createMainElement(): HTMLElement {
        const mainContainer: HTMLElement = document.createElement('div');
        mainContainer.id = 'root';
        mainContainer.className = 'root';
        return mainContainer;
    }

    private setupRoutes(): void {
        this.router.addRoute('/auth', (): void => this.showAuthPage());
        this.router.addRoute('/main', (): void => this.showMainPage());
        this.router.addRoute('/info', (): void => this.showInfoPage());
    }

    public start(): void {
        this.setupWebSocket();
    }

    private showInfoPage(): void {
        this.clearMainElement();
        const infoPage = new InfoPage();
        this.mainElement.appendChild(infoPage.render());
        sessionStorage.setItem('last-visited-path', '/info');
    }

    private setupWebSocket(): void {
        this.ws.onopen = (): void => {
            console.log('WebSocket connected');

            const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
            const currentUser = sessionStorage.getItem('currentUser');
            const userPassword = sessionStorage.getItem('userPassword');

            if (isAuthenticated && currentUser && userPassword) {
                const reAuthRequest = {
                    id: `reauth_${Date.now()}`,
                    type: 'USER_LOGIN',
                    payload: {
                        user: {
                            login: currentUser,
                            password: userPassword
                        }
                    }
                };
                this.ws.send(JSON.stringify(reAuthRequest));
            }
        };

        this.ws.onerror = (error: Event): void => {
            console.error('WebSocket error:', error);
        };

        this.ws.onclose = (): void => {
            console.log('WebSocket closed');
        };
    }

    private showAuthPage(): void {
        this.clearMainElement();
        this.mainPage = null;

        sessionStorage.removeItem('isAuthenticated');
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('userPassword');

        this.authPage = new AuthWebsocket(this.mainElement, this.ws);

        this.authPage.setOnAuthSuccess((userData: {login: string, password: string}): void => {
            sessionStorage.setItem('isAuthenticated', 'true');
            sessionStorage.setItem('currentUser', userData.login);
            sessionStorage.setItem('userPassword', userData.password);

            this.router.navigate('/main');
        });

        this.authPage.setOnAuthError((error: string): void => {
            console.error('Auth error:', error);
        });
    }

    private showMainPage(): void {
        this.clearMainElement();
        this.authPage = null;

        const currentUser = sessionStorage.getItem('currentUser');
        const userPassword = sessionStorage.getItem('userPassword');

        if (!currentUser || !userPassword) {
            this.router.navigate('/auth');
            return;
        }

        this.mainPage = new MainPage(
            'main-page',
            currentUser,
            userPassword,
            this.ws,
            (): void => {
                this.handleLogout();
            }
        );

        this.mainElement.appendChild(this.mainPage.render());

        sessionStorage.setItem('last-visited-path', '/main');
    }

    private handleLogout(): void {
        sessionStorage.removeItem('isAuthenticated');
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('userPassword');
        sessionStorage.removeItem('last-visited-path');
        sessionStorage.removeItem('lastSelectedUser');

        if (this.mainPage && typeof (this.mainPage as any).destroy === 'function') {
            (this.mainPage as any).destroy();
        }
        this.mainPage = null;

        this.router.navigate('/auth');
    }

    private clearMainElement(): void {
        if (this.authPage) {
            this.authPage.destroy();
            this.authPage = null;
        }

        if (this.mainPage && typeof (this.mainPage as any).destroy === 'function') {
            (this.mainPage as any).destroy();
        }
        this.mainPage = null;

        this.mainElement.innerHTML = '';
    }

    public destroy(): void {
        this.ws.close();
        this.clearMainElement();
    }
}
