// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BATCH} from 'redux-batched-actions';

export const BREADCRUMB_REDUX_ACTION = 'redux-action';

let Sentry;
export default function createSentryMiddleware() {
    if (!Sentry) {
        Sentry = require('@sentry/react-native');
    }

    return () => (next) => (action) => {
        Sentry.addBreadcrumb(makeBreadcrumbFromAction(action));

        return next(action);
    };
}

function makeBreadcrumbFromAction(action) {
    if (!action.type) {
        console.warn('dispatching action with undefined type', action); // eslint-disable-line no-console
    }

    const breadcrumb = {
        category: BREADCRUMB_REDUX_ACTION,
        message: action.type || 'undefined action',
    };

    if (action.type === BATCH) {
        // Attach additional information so that batched actions display what they're doing, and make it
        // into an object because that's what is expected
        breadcrumb.data = {};

        action.payload.forEach((a, index) => {
            breadcrumb.data[index] = a.type || 'undefined action';
        });
    }

    return breadcrumb;
}
