// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

interface NotificationUserInfo {
    local: boolean;
    test?: boolean;
}

interface NotificationData {
    body?: string;
    channel_id: string;
    channel_name?: string;
    from_webhook?: string;
    message?: string;
    override_icon_url?: string;
    override_username?: string;
    post_id: string;
    root_id?: string;
    sender_id?: string;
    team_id?: string;
    type: string;
    use_user_icon?: string;
    userInfo?: NotificationUserInfo;
    version: string;
}

interface NotificationWithData extends Notification {
    identifier: string;
    payload?: NotificationData;
    foreground?: boolean;
    userInteraction?: boolean;
}
