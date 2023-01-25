// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {cleanUrlForLogging} from '@utils/url';

import type {IntlShape} from 'react-intl';

export class ClientError extends Error {
    details: Error;
    intl?: {defaultMessage?: string; id: string} | { defaultMessage?: string; id: string } | { id: string; defaultMessage?: string; values: any } | { id: string; defaultMessage?: string };
    url: string;
    server_error_id?: string | number;
    status_code?: number;

    constructor(baseUrl: string, data: ClientErrorProps) {
        super(`${data.message}: ${cleanUrlForLogging(baseUrl, data.url)}`);

        this.details = data.details;
        this.intl = data.intl;
        this.message = data.message;
        this.server_error_id = data.server_error_id;
        this.status_code = data.status_code;
        this.url = data.url;

        // Ensure message is treated as a property of this class when object spreading. Without this,
        // copying the object by using `{...error}` would not include the message.
        Object.defineProperty(this, 'message', {enumerable: true});
    }
}

export const getErrorMessage = (error: Error | string, intl: IntlShape) => {
    const intlError = error as ClientError;
    if (intlError.intl) {
        return intl.formatMessage(intlError.intl);
    } else if (error instanceof Error) {
        return error.message;
    }

    return error;
};
