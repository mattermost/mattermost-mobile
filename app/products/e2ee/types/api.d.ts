// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type EnabledDevice = {
    device_id: string;
    signature_public_key?: string;
    device_name: string;
    created_at: number;
    last_active_at: number;
    revoke_at?: number;
    os_version?: string;
    app_version?: string;
    verified?: boolean;
}

type EnabledDevicesReturn = {
    devices: EnabledDevice[];
}
