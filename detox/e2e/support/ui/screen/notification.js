// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class NotificationScreen {
    testID = {
        inAppNotification: 'in_app_notification',
        inAppNotificationIcon: 'in_app_notification.icon',
        inAppNotificationTitle: 'in_app_notification.title',
        inAppNotificationMessage: 'in_app_notification.message',
    }

    inAppNotification = element(by.id(this.testID.inAppNotification));
    inAppNotificationIcon = element(by.id(this.testID.inAppNotificationIcon));
    inAppNotificationTitle = element(by.id(this.testID.inAppNotificationTitle));
    inAppNotificationMessage = element(by.id(this.testID.inAppNotificationMessage));

    toBeVisible = async () => {
        await expect(this.inAppNotification).toBeVisible();

        return this.inAppNotification;
    }
}

const notificationScreen = new NotificationScreen();
export default notificationScreen;
