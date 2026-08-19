// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type logLevel = 'ERROR' | 'WARNING' | 'INFO';

type BaseRequestGroupLabel = 'Login' | 'Cold Start' | 'Notification' | 'DeepLink' | 'WebSocket Reconnect' | 'Server Switch' | 'Database Recovery';
type RequestGroupLabel = BaseRequestGroupLabel | `${BaseRequestGroupLabel} Deferred`;

type ClientOptions = {
    body?: any;
    method?: string;
    noRetry?: boolean;

    // Opt a non-idempotent (POST) call into the transient-transport retry in ClientBase.doFetch.
    // Only set this for read-only POSTs (e.g. posts/search) — a dead pooled socket returns
    // NSURLError -1005 before reaching the server, so retrying cannot duplicate a write.
    retryOnTransient?: boolean;
    timeoutInterval?: number;
    headers?: Record<string, any>;
    groupLabel?: RequestGroupLabel;
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
    headers?: Record<string, string>;
    message: string;
}
