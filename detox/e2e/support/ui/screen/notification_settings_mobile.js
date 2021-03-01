// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NotificationSettingsScreen} from '@support/ui/screen';

class NotificationSettingsMobileScreen {
    testID = {
        notificationSettingsMobileScreen: 'notification_settings_mobile.screen',
        backButton: 'screen.back.button',
        allAction: 'notification_settings_mobile.all.action',
        mentionsAction: 'notification_settings_mobile.mentions.action',
        neverAction: 'notification_settings_mobile.never.action',

        // ANDROID ONLY
        pushAction: 'notification_settings_mobile.push.action',
        pushModal: 'notification_settings_mobile.push.modal',
        pushModalCancelButton: 'notification_settings_mobile.push_modal_cancel.button',
        pushModalSaveButton: 'notification_settings_mobile.push_modal_save.button',
    }

    notificationSettingsMobileScreen = element(by.id(this.testID.notificationSettingsMobileScreen));
    backButton = element(by.id(this.testID.backButton));
    allAction = element(by.id(this.testID.allAction));
    mentionsAction = element(by.id(this.testID.mentionsAction));
    neverAction = element(by.id(this.testID.neverAction));

    // ANDROID ONLY
    pushAction = element(by.id(this.testID.pushAction));
    pushModal = element(by.id(this.testID.pushModal));
    pushModalCancelButton = element(by.id(this.testID.pushModalCancelButton));
    pushModalSaveButton = element(by.id(this.testID.pushModalSaveButton));

    getPushActionFor = (pushKey) => {
        switch (pushKey) {
        case 'all':
            return this.allAction;
        case 'mentions':
            return this.mentionsAction;
        case 'never':
            return this.neverAction;
        default:
            throw new Error('Not a valid push option: ' + pushKey);
        }
    }

    toBeVisible = async () => {
        await expect(this.notificationSettingsMobileScreen).toBeVisible();

        return this.notificationSettingsMobileScreen;
    }

    open = async () => {
        // # Open notification settings mobile screen
        await NotificationSettingsScreen.mobileAction.tap();

        return this.toBeVisible();
    }

    back = async () => {
        await this.backButton.tap();
        await expect(this.notificationSettingsMobileScreen).not.toBeVisible();
    }
}

const notificationSettingsMobileScreen = new NotificationSettingsMobileScreen();
export default notificationSettingsMobileScreen;
