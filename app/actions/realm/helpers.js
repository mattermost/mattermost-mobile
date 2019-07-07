// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import EventEmitter from 'mattermost-redux/utils/event_emitter'; //TODO: Build local event emitter and replace everywhere

import {NavigationTypes} from 'app/constants';

const HTTP_UNAUTHORIZED = 401;

export function forceLogoutIfNecessary(clientError) {
    if (clientError.status_code === HTTP_UNAUTHORIZED && clientError.url && clientError.url.indexOf('/login') === -1) {
        EventEmitter.emit(NavigationTypes.NAVIGATION_RESET);
    }
}

export class FormattedError extends Error {
    intl: {
        id: string,
        defaultMessage: string,
        values: Object
    };

    constructor(id: string, defaultMessage: string, values: Object = {}) {
        super(defaultMessage);
        this.intl = {
            id,
            defaultMessage,
            values,
        };
    }
}
