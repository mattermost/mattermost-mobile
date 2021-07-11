// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

interface Session {
    id: string;
    create_at: string|number;
    device_id?: string;
    expires_at: string|number;
    user_id: string;
}
