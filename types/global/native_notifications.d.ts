// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

interface NativeNotificationSound {
    name: string;
    uri: string;
}

interface NativeNotificationPreferences {
    selectedUri?: string;
    shouldBlink: boolean;
    shouldVibrate: boolean;
    sounds: NativeNotificationSound[];
}

interface NativeNotification {
    getDeliveredNotifications(): Promise<NotificationWithChannel[]>;
    getPreferences(): Promise<NativeNotificationPreferences|null>;
    play(soundUri: string): void;
    removeDeliveredNotifications(identifier: string | string[], channelId?: string): void;
    setNotificationSound(): void;
    setShouldBlink(shouldBlink: boolean): void;
    setShouldVibrate(shouldVibrate: boolean): void;
}
