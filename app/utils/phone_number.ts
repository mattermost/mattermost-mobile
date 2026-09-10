// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type PhoneNumberMatch = {
    index: number;
    length: number;
    raw: string;
    href: string;
}

// tel:/E.164 (+ and 7–15 digits) or NANP grouped numbers (separators required).
const PHONE_NUMBER_PATTERN = /(?:tel:(?:\+[1-9](?:[\s.\-()]*\d){6,14}|[+]?(?:[\s.\-()]*\d){7,15})|\+[1-9](?:[\s.\-()]*\d){6,14}|(?:\+?1[\s.\-]?)?(?:\(\d{3}\)[\s.\-]?|\d{3}[\s.\-])\d{3}[\s.\-]\d{4})/i;

const MIN_PHONE_DIGITS = 7;
const MAX_PHONE_DIGITS = 15;

export function isTelHref(href: string): boolean {
    return href.toLowerCase().startsWith('tel:');
}

export function toTelHref(raw: string): string {
    const withoutScheme = raw.replace(/^tel:/i, '');
    const hasPlus = withoutScheme.trimStart().startsWith('+');
    const digits = withoutScheme.replace(/\D/g, '');
    return `tel:${hasPlus ? '+' : ''}${digits}`;
}

function isValidBoundary(text: string, index: number): boolean {
    if (index <= 0) {
        return true;
    }

    return !(/[0-9A-Za-z]/).test(text.charAt(index - 1));
}

function isValidEndBoundary(text: string, end: number): boolean {
    if (end >= text.length) {
        return true;
    }

    return !(/[0-9A-Za-z]/).test(text.charAt(end));
}

function isValidDigitCount(href: string): boolean {
    const digits = href.replace(/^tel:\+?/, '');
    return digits.length >= MIN_PHONE_DIGITS && digits.length <= MAX_PHONE_DIGITS;
}

export function findPhoneNumbers(text: string): PhoneNumberMatch[] {
    if (!text) {
        return [];
    }

    const matches: PhoneNumberMatch[] = [];
    const regex = new RegExp(PHONE_NUMBER_PATTERN.source, 'gi');
    let result = regex.exec(text);

    while (result) {
        const raw = result[0];
        const index = result.index;

        if (isValidBoundary(text, index) && isValidEndBoundary(text, index + raw.length)) {
            const href = toTelHref(raw);
            if (isValidDigitCount(href)) {
                matches.push({
                    index,
                    length: raw.length,
                    raw,
                    href,
                });
            }
        }

        result = regex.exec(text);
    }

    return matches;
}
