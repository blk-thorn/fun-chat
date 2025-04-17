export default class AuthPage {
    private readonly container: HTMLElement;

    constructor(container: HTMLElement) {
        this.container = container;
        this.render();
    }

    private render(): void {
        const authContainer: HTMLDivElement = document.createElement('div');
        const authForm: HTMLFormElement = document.createElement('form');
        authForm.classList.add('auth-form');
        authForm.id = 'auth-form';

        const nameContainer: HTMLDivElement = document.createElement('div');
        nameContainer.classList.add('form-group');
        const nameLabel: HTMLLabelElement = document.createElement('label');
        nameLabel.setAttribute('for', 'username');
        const nameInput: HTMLInputElement = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'username';
        nameInput.placeholder = 'Username';
        nameInput.setAttribute('name', 'username');
        nameContainer.append(nameLabel, nameInput);

        const passwordContainer: HTMLDivElement = document.createElement('div');
        passwordContainer.classList.add('form-group');
        const passwordLabel: HTMLLabelElement = document.createElement('label');
        passwordLabel.setAttribute('for', 'password');
        const passwordInput: HTMLInputElement = document.createElement('input');
        passwordInput.type = 'password';
        passwordInput.id = 'password';
        passwordInput.setAttribute('name', 'password');
        passwordInput.placeholder = 'Password';
        passwordContainer.append(passwordLabel, passwordInput);

        const submitButton: HTMLButtonElement = document.createElement('button');
        submitButton.type = 'submit';
        submitButton.id = 'submit';
        submitButton.classList.add('button', 'button__submit');
        submitButton.textContent = 'Enter';

        const infoButton: HTMLButtonElement = document.createElement('button');
        infoButton.type = 'button';
        infoButton.classList.add('button', 'button__info');
        infoButton.textContent = 'Info';
        authForm.append(nameContainer, passwordContainer, submitButton, infoButton);
        authContainer.appendChild(authForm);
        this.container.appendChild(authContainer);
    }
}
