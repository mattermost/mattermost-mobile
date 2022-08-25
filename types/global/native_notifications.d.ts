// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

interface NativeNotification {
    getDeliveredNotifications(): Promise<NotificationWithChannel[]>;
    removeChannelNotifications(serverUrl: string, channelId: string): void;
    removeThreadNotifications(serverUrl: string, threadId: string): void;
    removeServerNotifications(serverUrl: string): void;
}
