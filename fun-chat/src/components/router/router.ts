export default class Router {
    private routes: Record<string, () => void> = {};
    private currentPath: string = '/';
    rootElement: HTMLElement;

    constructor(rootElement: HTMLElement) {
        this.rootElement = rootElement;
        this.setupPopstateListener();
        this.handlePopState();
    }

    private setupPopstateListener(): void {
        window.addEventListener('popstate', (event: PopStateEvent): void => {
            if (event.state && event.state.path) {
                this.navigate(event.state.path, false);
            }
        });
    }

    public addRoute(path: string, callback: () => void): void {
        this.routes[path] = callback;
    }

    public navigate(path: string, addToHistory: boolean = true): void {
        if (path === this.currentPath) return;

        if (addToHistory) {
            window.history.pushState({ path }, '', path);
        }

        this.currentPath = path;

        const routeCallback:(() => void) | undefined = this.routes[path];
        if (routeCallback) {
            routeCallback();
        } else {
            this.navigate('/auth');
        }
    }

    private handlePopState(): void {
        window.addEventListener('popstate', () => {
            const path = window.location.pathname;
            if (path) {
                const lastPath = sessionStorage.getItem('last-visited-path') || '/main';
                this.navigate(lastPath, false);
            }
        });
    }

}
