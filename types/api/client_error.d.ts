// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

interface ClientErrorProps extends Error {
    details: Error;
    intl?: {defaultMessage?: string; id: string;} | { defaultMessage?: string; id: string } | { id: string; defaultMessage?: string; values: any } | { id: string; defaultMessage?: string };
    url: string;
    server_error_id?: string | number;
    status_code?: number;
}
