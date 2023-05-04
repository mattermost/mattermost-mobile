// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type logLevel = 'ERROR' | 'WARNING' | 'INFO';

type ClientOptions = {
    body?: any;
    method?: string;
    noRetry?: boolean;
    timeoutInterval?: number;
    headers?: Record<string, any>;
};

type ClientErrorIntl =
    {defaultMessage?: string; id: string; values?: Record<string, any>} |
    {defaultMessage?: string; id: string; values?: Record<string, any>} |
    {id: string; defaultMessage?: string; values?: Record<string, any>} |
    {id: string; defaultMessage?: string; values?: Record<string, any>};

interface ClientErrorProps {
    details?: unknown;
    intl?: ClientErrorIntl;
    url: string;
    server_error_id?: string;
    status_code?: number;
    message: string;
}
