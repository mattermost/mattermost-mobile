// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Preferences from '@constants/preferences';

export function emptyFunction(e?: any) {// eslint-disable-line no-empty-function, @typescript-eslint/no-unused-vars
}

// Generates a RFC-4122 version 4 compliant globally unique identifier.
export const generateId = (): string => {
    // implementation taken from http://stackoverflow.com/a/2117523
    let id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    id = id.replace(/[xy]/g, (c) => {
        const r = Math.floor(Math.random() * 16);
        let v;

        if (c === 'x') {
            v = r;
        } else {
            // eslint-disable-next-line no-mixed-operators
            v = (r & 0x3) | 0x8;
        }

        return v.toString(16);
    });
    return id;
};

export const parseTheme = (theme: string) => {
    let parsedTheme: Theme = Preferences.THEMES.default;
    if (theme) {
        try {
            parsedTheme = JSON.parse(theme);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(`Unable to parseTheme with input ${parsedTheme}`);
        }
    }
    return parsedTheme;
};
