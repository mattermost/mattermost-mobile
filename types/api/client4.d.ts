// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type logLevel = 'ERROR' | 'WARNING' | 'INFO';
export type GenericClientResponse = {
    response: any;
    headers: Map<string, string>;
    data: any;
};
export type ErrorOffline = {
    message: string;
    url: string;
};
export type ErrorInvalidResponse = {
    intl: {
        id: string;
        defaultMessage: string;
    };
};
export type ErrorApi = {
    message: string;
    server_error_id: string;
    status_code: number;
    url: string;
};
export type Client4Error = ErrorOffline | ErrorInvalidResponse | ErrorApi;
export type ClientOptions = {
    headers?: {
        [x: string]: string;
    };
    method?: string;
    url?: string;
    credentials?: 'omit' | 'same-origin' | 'include';
    body?: any;
};
