import type { IMessageOptions } from '../types/types';
import './message.css';

export default class Message {
    private readonly messageText: string;
    private readonly messageDateTime: Date;
    public recipientName: string;
    public isCurrentUser: boolean;
    private deliveryStatus: string;
    private isEdited: boolean;
    private readonly id: string;
    public senderName: string;
    private element: HTMLElement | null = null;
    private statusObj: {isDelivered: boolean, isReaded: boolean, isEdited: boolean} | null = null;

    constructor(options: IMessageOptions) {
        this.messageText = options.text;
        this.messageDateTime = options.datetime ? new Date(options.datetime) : new Date();
        this.recipientName = options.recipient || '';
        this.isCurrentUser = options.isCurrentUser ?? false;

        if (options.status && typeof options.status === 'object' && options.status !== null) {
            this.statusObj = options.status;
            this.deliveryStatus = this.convertStatusToSymbol(options.status);
        } else if (typeof options.status === 'string') {
            this.deliveryStatus = options.status;
            this.statusObj = {
                isDelivered: this.deliveryStatus !== '🕒',
                isReaded: this.deliveryStatus === '👁✓',
                isEdited: options.isEdited || false
            };
        } else {
            this.deliveryStatus = '✓';
            this.statusObj = {
                isDelivered: true,
                isReaded: false,
                isEdited: options.isEdited || false
            };
        }

        this.isEdited = options.isEdited || false;
        this.id = options.id;
        this.senderName = options.senderName || options.currentUser || '';
    }

    private convertStatusToSymbol(status: {isDelivered: boolean, isReaded: boolean, isEdited: boolean}): string {
        if (!status.isDelivered) return '🕒';
        if (status.isReaded) return '👁✓';
        return '✓';
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

    public getStatus(): {isDelivered: boolean, isReaded: boolean, isEdited: boolean} | null {
        return this.statusObj;
    }

    public isRead(): boolean {
        return this.statusObj?.isReaded || false;
    }

    public isDelivered(): boolean {
        return this.statusObj?.isDelivered || false;
    }

    render(): HTMLElement {
        const messageWrapper: HTMLDivElement = document.createElement('div');
        messageWrapper.className = 'message-wrapper';
        if (this.id) {
            messageWrapper.setAttribute('data-message-id', this.id);
        }

        const messageBlock: HTMLDivElement = document.createElement('div');
        messageBlock.className = 'message';
        if (this.isCurrentUser) {
            messageBlock.classList.add('message--current-user');
        }

        const messageHeader: HTMLDivElement = document.createElement('div');
        messageHeader.className = 'message__header';
        const userSpan: HTMLSpanElement = document.createElement('span');
        userSpan.className = 'message__user';
        userSpan.textContent = `${this.senderName}`;
        const datetimeSpan: HTMLSpanElement = document.createElement('span');
        datetimeSpan.className = 'message__datetime';
        datetimeSpan.textContent = `${this.formatDate()} ${this.formatTime()}`;
        messageHeader.append(userSpan, datetimeSpan);
        messageBlock.appendChild(messageHeader);

        const messageContent: HTMLDivElement = document.createElement('div');
        messageContent.className = 'message__text';
        messageContent.textContent = this.messageText;
        messageBlock.appendChild(messageContent);

        const messageStatus: HTMLDivElement = document.createElement('div');
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
        this.element = messageWrapper;
        return messageWrapper;
    }

    public updateStatus(statusUpdate: {messageId: string, status: {isDelivered: boolean, isReaded: boolean, isEdited: boolean}}): void {
        if (statusUpdate.messageId !== this.id) {
            return;
        }

        this.statusObj = statusUpdate.status;
        this.deliveryStatus = this.convertStatusToSymbol(statusUpdate.status);
        this.isEdited = statusUpdate.status.isEdited || this.isEdited;

        if (!this.element) {
            return;
        }

        const statusEl = this.element.querySelector('.message__status');
        if (!statusEl) {
            return;
        }

        statusEl.textContent = this.deliveryStatus;
        statusEl.className = 'message__status';

        if (this.deliveryStatus === '🕒') {
            statusEl.classList.add('message__status--sending');
        } else if (this.deliveryStatus === '👁✓') {
            statusEl.classList.add('message__status--read');
        }

        const existingEditedMark = statusEl.querySelector('.message__edited');
        if (this.isEdited && !existingEditedMark) {
            const editedMark: HTMLSpanElement = document.createElement('span');
            editedMark.className = 'message__edited';
            editedMark.textContent = ' (edited)';
            statusEl.appendChild(editedMark);
        } else if (!this.isEdited && existingEditedMark) {
            existingEditedMark.remove();
        }
    }
}
