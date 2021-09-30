// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {cleanUrlForLogging} from '@utils/url';

export default class ClientError extends Error {
    url: string;
    intl: { defaultMessage: string; id: string; values?: any };
    server_error_id: any;
    status_code: any;
    details: Error;
    constructor(baseUrl: string, data: any) {
        super(data.message + ': ' + cleanUrlForLogging(baseUrl, data.url));

        this.message = data.message;
        this.url = data.url;
        this.intl = data.intl;
        this.server_error_id = data.server_error_id;
        this.status_code = data.status_code;
        this.details = data.details;

        // Ensure message is treated as a property of this class when object spreading. Without this,
        // copying the object by using `{...error}` would not include the message.
        Object.defineProperty(this, 'message', {enumerable: true});
    }
}
