// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {timeouts} from '@support/utils';

class NotificationScreen {
    testID = {
        inAppNotificationScreen: 'in_app_notification.screen',
        inAppNotificationIcon: 'in_app_notification.icon',
        inAppNotificationTitle: 'in_app_notification.title',
        inAppNotificationMessage: 'in_app_notification.message',
    }

    inAppNotificationScreen = element(by.id(this.testID.inAppNotificationScreen));
    inAppNotificationIcon = element(by.id(this.testID.inAppNotificationIcon));
    inAppNotificationTitle = element(by.id(this.testID.inAppNotificationTitle));
    inAppNotificationMessage = element(by.id(this.testID.inAppNotificationMessage));

    toBeVisible = async () => {
        await waitFor(this.inAppNotificationScreen).toBeVisible().withTimeout(timeouts.TEN_SEC);

        return this.inAppNotificationScreen;
    }
}

const notificationScreen = new NotificationScreen();
export default notificationScreen;
