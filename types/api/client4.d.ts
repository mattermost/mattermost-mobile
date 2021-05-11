// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

declare type logLevel = 'ERROR' | 'WARNING' | 'INFO';
declare type GenericClientResponse = {
    response: any;
    headers: Map<string, string>;
    data: any;
};
declare type ErrorOffline = {
    message: string;
    url: string;
};
declare type ErrorInvalidResponse = {
    intl: {
        id: string;
        defaultMessage: string;
    };
};
declare type ErrorApi = {
    message: string;
    server_error_id: string;
    status_code: number;
    url: string;
};
declare type Client4Error = ErrorOffline | ErrorInvalidResponse | ErrorApi;
declare type ClientOptions = {
    headers?: {
        [x: string]: string;
    };
    method?: string;
    url?: string;
    credentials?: 'omit' | 'same-origin' | 'include';
    body?: any;
};
