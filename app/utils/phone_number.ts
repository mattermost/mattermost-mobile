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

// Hyphens and dots continue a digit run (`+123456789012345-6`). Spaces and
// parentheses are left as boundaries so a following number still matches.
const PHONE_CONTINUATION = /[.\-]/;

export function isTelHref(href: string): boolean {
    return href.toLowerCase().startsWith('tel:');
}

export function toTelHref(raw: string): string {
    const withoutScheme = raw.replace(/^tel:/i, '');
    const hasPlus = withoutScheme.trimStart().startsWith('+');
    const digits = withoutScheme.replace(/\D/g, '');
    return `tel:${hasPlus ? '+' : ''}${digits}`;
}

function isDigit(char: string) {
    return char >= '0' && char <= '9';
}

function isValidPhoneBoundary(text: string, index: number, direction: -1 | 1) {
    const start = direction === -1 ? index - 1 : index;
    if (start < 0 || start >= text.length) {
        return true;
    }

    if ((/[0-9A-Za-z]/).test(text.charAt(start))) {
        return false;
    }

    let i = start;
    while (i >= 0 && i < text.length && PHONE_CONTINUATION.test(text.charAt(i))) {
        i += direction;
    }

    if (i < 0 || i >= text.length) {
        return true;
    }

    return !isDigit(text.charAt(i));
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

        if (isValidPhoneBoundary(text, index, -1) && isValidPhoneBoundary(text, index + raw.length, 1)) {
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
