// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function nonBreakingString(s: string) {
    return s.replace(' ', '\xa0');
}

export function generateRandomString(length: number) {
    let result = '';
    let counter = 0;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charsLenght = chars.length;
    while (counter < length) {
        result += chars.charAt(Math.floor(Math.random() * charsLenght));
        counter += 1;
    }
    return result;
}
