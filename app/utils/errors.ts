// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {IntlShape} from 'react-intl';

export function isServerError(obj: unknown): obj is {server_error_id?: string} {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        (
            ('server_error_id' in obj) &&
            typeof obj.server_error_id === 'string'
        )
    );
}

export function isErrorWithMessage(obj: unknown): obj is {message: string} {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'message' in obj &&
        typeof obj.message === 'string'
    );
}

export function isErrorWithDetails(obj: unknown): obj is {details: Error} {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'details' in obj &&
        typeof obj.details !== 'undefined'
    );
}

export function isErrorWithIntl(obj: unknown): obj is {intl: ClientErrorIntl} {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'intl' in obj &&
        typeof obj.intl === 'object' &&
        obj.intl !== null
    );
}

export function isErrorWithStatusCode(obj: unknown): obj is {status_code: number} {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'status_code' in obj &&
        typeof obj.status_code === 'number'
    );
}

export function isErrorWithUrl(obj: unknown): obj is {url?: string} {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        ('url' in obj) &&
        typeof obj.url === 'string'
    );
}

export const getFullErrorMessage = (error: unknown, intl?: IntlShape, depth = 0): string => {
    const message = getErrorMessage(error, intl);
    if (isErrorWithDetails(error)) {
        if (depth > 2) {
            return `${message}; ${getErrorMessage(error, intl)}`;
        }

        return `${message}; ${getFullErrorMessage(error.details, intl, depth + 1)}`;
    }

    return message;
};

export const getErrorMessage = (error: unknown, intl?: IntlShape) => {
    if (typeof error === 'string') {
        return error;
    }
    if (isErrorWithIntl(error)) {
        return intl ? intl.formatMessage({id: error.intl.id, defaultMessage: error.intl.defaultMessage}, error.intl.values) : error.intl.defaultMessage!;
    }

    if (isErrorWithMessage(error)) {
        return error.message;
    }

    return 'Unknown error';
};

export const getServerError = (error: unknown, depth = 0): string | undefined => {
    if (isServerError(error)) {
        return error.server_error_id!;
    }
    if (isErrorWithDetails(error)) {
        if (depth > 2) {
            return undefined;
        }
        return getServerError(error.details, depth + 1);
    }
    return undefined;
};
