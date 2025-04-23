import type { IMessageOptions } from '../types/types';
import './message.css';

export default class Message {
    private readonly messageText: string;
    private readonly messageDateTime: Date;
    public recipientName: string;
    public isCurrentUser: boolean;
    private readonly deliveryStatus: string;
    private readonly isEdited: boolean;
    private readonly id: string;
    public currentUser: string;

    constructor(options: IMessageOptions) {
        this.messageText = options.text;
        this.messageDateTime = options.datetime ? new Date(options.datetime) : new Date();
        this.recipientName = options.recipient || '';
        this.isCurrentUser = options.isCurrentUser ?? false;
        this.deliveryStatus = options.status || '✓';
        this.isEdited = options.isEdited || false;
        this.id = options.id;
        this.currentUser = options.currentUser || '';
    }

    private formatTime(): string {
        return `${this.messageDateTime.getHours().toString().padStart(2, '0')}:${
            this.messageDateTime.getMinutes().toString().padStart(2, '0')}`;
    }

    private formatDate(): string {
        return `${this.messageDateTime.getDate().toString().padStart(2, '0')}.${
            (this.messageDateTime.getMonth() + 1).toString().padStart(2, '0')}.${
            this.messageDateTime.getFullYear()}`;
    }

    render(): HTMLElement {
        const messageWrapper: HTMLDivElement = document.createElement('div');
        messageWrapper.className = 'message-wrapper';
            if (this.id) {
                messageWrapper.setAttribute('data-message-id', this.id);
            }

        const messageBlock: HTMLDivElement = document.createElement('div');
        messageBlock.className = 'message';

        const messageHeader: HTMLDivElement = document.createElement('div');
        messageHeader.className = 'message__header';

        const userSpan: HTMLSpanElement = document.createElement('span');
        userSpan.className = 'message__user';
        userSpan.textContent = `${this.currentUser}`;
        messageHeader.appendChild(userSpan);

        const datetimeSpan: HTMLSpanElement = document.createElement('span');
        datetimeSpan.className = 'message__datetime';
        datetimeSpan.textContent = `${this.formatDate()} ${this.formatTime()}`;
        messageHeader.appendChild(datetimeSpan);

        messageBlock.appendChild(messageHeader);

        const messageContent: HTMLSpanElement = document.createElement('div');
        messageContent.className = 'message__text';
        messageContent.textContent = this.messageText;
        messageBlock.appendChild(messageContent);

        const messageStatus: HTMLSpanElement = document.createElement('div');
        messageStatus.className = `message__status ${
            this.deliveryStatus === '🕒' ? 'message__status--sending' :
                this.deliveryStatus === '👁✓' ? 'message__status--read' : ''
        }`;
        messageStatus.textContent = this.deliveryStatus;
        messageBlock.appendChild(messageStatus);

        if (this.isEdited) {
            const editedMark: HTMLSpanElement = document.createElement('span');
            editedMark.className = 'message__edited';
            editedMark.textContent = ' (edited)';
            messageStatus.appendChild(editedMark);
        }

        messageWrapper.appendChild(messageBlock);
        return messageWrapper;
    }
}
