// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

interface NotificationUserInfo {
    localNotification: boolean;
    localTest: boolean;
    channel_id?: string;
}

interface NotificationData {
    channel_id: string;
    channel_name?: string;
    from_webhook?: string;
    post_id: string;
    root_id?: string;
    type: string;
    use_user_icon?: string;
    override_icon_url?: string;
    override_username?: string;
    version: string;
    sender_id?: string;
}

interface NotificationMessage {
    body: string;
}

interface PushNotificationData {
    date?: Date;
    data?: NotificationData;
    fireDate?: string;
    foreground: boolean;
    message: NotificationMessage | string;
    userInfo?: NotificationUserInfo;
    userInteraction: boolean;
}