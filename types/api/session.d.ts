// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

interface Session {
    id: string;
    create_at: number;
    device_id?: string;
    expires_at: number;
    user_id: string;
    props?: {
        os: string;
        csrf: string;
    };
}

interface LoginActionResponse {
    error?: unknown;
    failed: boolean;
}
