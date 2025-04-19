import AuthPage from './auth-page';

export default class AuthWebsocket extends AuthPage {
    private onAuthSuccess: ((user: {login: string, password: string}) => void)  | undefined;
    private onAuthError: ((error: string) => void) | undefined;
    private ws: WebSocket;
    private currentRequestId: string = '';

    constructor(container: HTMLElement, ws: WebSocket) {
        super(container);
        this.ws = ws;
        this.onAuthSuccess = () => {};
        this.setupWebSocketListeners();
        this.setupEventListeners();
    }

    private setupWebSocketListeners(): void {
        this.ws.onmessage = (event): void => {
            try {
                const response = this.parseWebSocketMessage(event.data);
                console.log(response);
                this.handleServerResponse(response);
            } catch (error) {
                this.handleWebSocketError(error);
            }
        };
    }

    private parseWebSocketMessage(data: string): any {
        try {
            return JSON.parse(data);
        } catch (error) {
            throw new Error('Invalid server response format');
        }
    }

    private setupEventListeners(): void {
        const form: HTMLFormElement | null = this.getElement<HTMLFormElement>('#auth-form');
        if (form) {
            form.addEventListener('submit', this.handleFormSubmit.bind(this));
        }

        this.setupInputValidation('#username');
        this.setupInputValidation('#password');
    }

    private setupInputValidation(selector: string): void {
        const input: HTMLInputElement | null = this.getElement<HTMLInputElement>(selector);
        if (input) {
            input.addEventListener('input', this.validateInputs.bind(this));
        }
    }

    private validateInputs(): void {
        const validateField = (selector: string): void => {
            const input: HTMLInputElement | null = this.getElement<HTMLInputElement>(selector);
            if (!input) return;

            const value = input.value.trim();
            if (value.length === 0) {
                this.clearError(input);
            } else if (value.length < 4) {
                this.showError(input, 'Length must be more than 4 characters');
            } else if (!this.hasBothCases(value)) {
                this.showError(input, 'Must contain both uppercase and lowercase letters');
            } else {
                this.clearError(input);
            }
        };

        validateField('#username');
        validateField('#password');
    }

    private handleFormSubmit(e: Event): void {
        e.preventDefault();
        this.handleLogin();
    }

    public setOnAuthSuccess(callback: (userData: {login: string, password: string}) => void): void {
        this.onAuthSuccess = callback;
    }

    public setOnAuthError(callback: (error: string) => void): void {
        this.onAuthError = callback;
    }

    private handleLogin(): void {
        const loginInput: HTMLInputElement | null = this.getElement<HTMLInputElement>('#username');
        const passwordInput: HTMLInputElement | null = this.getElement<HTMLInputElement>('#password');

        if (!loginInput || !passwordInput) {
            this.callIfDefined(this.onAuthError, 'Authorization form not found');
            return;
        }

        const login: string = loginInput.value.trim();
        const password: string = passwordInput.value.trim();

        if (!this.validateCredentials(login, password, loginInput, passwordInput)) {
            return;
        }

        this.sendAuthRequest(login, password);
    }

    private getElement<T extends HTMLElement>(selector: string): T | null {
        const element: Element | null = this.container.querySelector(selector);
        return element instanceof HTMLElement ? element as T : null;
    }

    private validateCredentials(
        login: string,
        password: string,
        loginInput: HTMLInputElement,
        passwordInput: HTMLInputElement
    ): boolean {
        const validateField = (
            value: string,
            input: HTMLInputElement,
            fieldName: string
        ): boolean => {
            if (value.length < 4) {
                this.showError(input, `${fieldName} length must be more than 4 characters`);
                return false;
            }
            if (!this.hasBothCases(value)) {
                this.showError(input, `${fieldName} must contain both uppercase and lowercase letters`);
                return false;
            }
            return true;
        };

        const isLoginValid: boolean = validateField(login, loginInput, 'Login');
        const isPasswordValid: boolean = validateField(password, passwordInput, 'Password');

        return isLoginValid && isPasswordValid;
    }

    private hasBothCases(str: string): boolean {
        return /[a-z]/.test(str) && /[A-Z]/.test(str);
    }

    private sendAuthRequest(login: string, password: string): void {
        this.currentRequestId = `req_${Date.now()}`;
        const request = {
            id: this.currentRequestId,
            type: 'USER_LOGIN',
            payload: {
                user: {
                    login,
                    password,
                },
            },
        };

        this.ws.send(JSON.stringify(request));
    }

    private showError(inputElement: HTMLInputElement, message: string): void {
        const existingError: Element | null = inputElement.nextElementSibling;
        if (existingError instanceof HTMLLabelElement && existingError.classList.contains('error-tooltip')) {
            existingError.textContent = message;
            return;
        }

        const errorElement: HTMLLabelElement = document.createElement('label');
        errorElement.classList.add('error-tooltip');
        errorElement.textContent = message;
        inputElement.insertAdjacentElement('afterend', errorElement);
    }

    private handleServerResponse(response: any): void {
        if (!response || response.id !== this.currentRequestId) return;

        const loginInput: HTMLInputElement | null = this.getElement<HTMLInputElement>('#username');
        const passwordInput: HTMLInputElement | null = this.getElement<HTMLInputElement>('#password');

        if (!loginInput || !passwordInput) return;

        if (response.type === 'USER_LOGIN') {
            this.handleLoginResponse(response, loginInput);
        } else if (response.type === 'ERROR') {
            this.handleErrorResponse(response, loginInput, passwordInput);
        }
    }

    private handleLoginResponse(response: any, loginInput: HTMLInputElement): void {
        const login: string = loginInput.value.trim();
        const passwordInput: HTMLInputElement | null = this.getElement<HTMLInputElement>('#password');

        if (response.payload?.user?.isLogined) {
            if(passwordInput) {
            const password: string = passwordInput.value;
            this.callIfDefined(this.onAuthSuccess, { login, password })
            }
        }
    }

    private handleErrorResponse(
        response: any,
        loginInput: HTMLInputElement,
        passwordInput: HTMLInputElement
    ): void {
        const errorMessage = response.payload?.error || 'Authorization error';
        this.callIfDefined(this.onAuthError, errorMessage);

        const errorInput: HTMLInputElement | null = this.determineErrorInput(response.payload?.error, loginInput, passwordInput);
        if (errorInput) {
            this.showError(errorInput, errorMessage);
        }
    }

    private determineErrorInput(
        errorText: string | undefined,
        loginInput: HTMLInputElement,
        passwordInput: HTMLInputElement
    ): HTMLInputElement | null {
        if (!errorText) return null;

        const lowerError: string = errorText.toLowerCase();
        return lowerError.includes('password') || lowerError === 'incorrect password'
            ? passwordInput
            : loginInput;
    }

    private clearError(inputElement: HTMLInputElement): void {
        const errorElement: Element | null = inputElement.nextElementSibling;
        if (errorElement instanceof HTMLLabelElement && errorElement.classList.contains('error-tooltip')) {
            errorElement.remove();
        }
    }

    private handleWebSocketError(error: unknown): void {
        const errorMessage: string = error instanceof Error ? error.message : 'WebSocket error';
        console.error('WebSocket error:', error);
        this.callIfDefined(this.onAuthError, errorMessage);
    }

    private callIfDefined<T>(callback: ((arg: T) => void) | undefined, arg: T): void {
        callback && callback(arg);
    }

    public override destroy(): void {
        super.destroy?.();

        this.ws.onmessage = null;
        const form: HTMLFormElement | null = this.getElement<HTMLFormElement>('#auth-form');
        if (form) {
            form.removeEventListener('submit', this.handleFormSubmit.bind(this));
        }

        this.removeInputValidation('#username');
        this.removeInputValidation('#password');

        this.onAuthSuccess = undefined;
        this.onAuthError = undefined;
    }

    private removeInputValidation(selector: string): void {
        const input: HTMLInputElement | null = this.getElement<HTMLInputElement>(selector);
        if (input) {
            input.removeEventListener('input', this.validateInputs.bind(this));
        }
    }
}
