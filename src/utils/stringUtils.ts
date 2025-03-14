// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
export class StringUtils {
    static capitalize(str: string): string {
        if (!str) {
            return str;
        }
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    static reverse(str: string): string {
        return str.split('').reverse().join('');
    }

    static countWords(str: string): number {
        if (!str.trim()) {
            return 0;
        }
        return str.trim().split(/\s+/).length;
    }

    static truncate(str: string, maxLength: number, suffix: string = '...'): string {
        if (str.length <= maxLength) {
            return str;
        }
        return str.slice(0, maxLength - suffix.length) + suffix;
    }

    static slugify(str: string): string {
        return str.
            toLowerCase().
            replace(/[^\w\s-]/g, '').
            replace(/[\s_-]+/g, '-').
            replace(/^-+|-+$/g, '');
    }

    static extractEmails(text: string): string[] {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        return text.match(emailRegex) || [];
    }

    static formatPhoneNumber(phone: string): string {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length !== 10) {
            throw new Error('Invalid phone number length');
        }
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
}
