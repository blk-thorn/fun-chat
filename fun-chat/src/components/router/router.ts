export default class Router {
    private routes: Record<string, () => void> = {};
    private currentPath: string = '/';
    rootElement: HTMLElement;

    constructor(rootElement: HTMLElement) {
        this.rootElement = rootElement;
        this.setupHashListener();
        const initialPath = window.location.hash.substring(1) || '/';
        this.navigate(initialPath, false);
    }

    private  setupHashListener(): void {
        window.addEventListener('hashchange', (): void => {
            const path = window.location.hash.substring(1) || '/';
            this.navigate(path, false);
        });
    }

    public addRoute(path: string, callback: () => void): void {
        this.routes[path] = callback;
    }

    public navigate(path: string, addToHistory: boolean = true): void {
        if (path === this.currentPath) return;

        this.handleRouteChange(path, addToHistory);
    }
    private handleRouteChange(path: string, addToHistory: boolean): void {
        if (path !== '/auth') {
            sessionStorage.setItem('last-visited-path', path);
        }

        if (addToHistory) {
            window.location.hash = `#${path}`;
        }

        this.currentPath = path;


        const routeCallback: (() => void) | undefined= this.routes[path];
        if (routeCallback) {
            routeCallback();
        } else {
            const lastPath: string = sessionStorage.getItem('last-visited-path') || '/main';
            this.navigate(lastPath, true);
        }
    }

}
