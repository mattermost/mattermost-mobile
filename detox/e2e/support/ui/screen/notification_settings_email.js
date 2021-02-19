// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NotificationSettingsScreen} from '@support/ui/screen';

class NotificationSettingsEmailScreen {
    testID = {
        notificationSettingsEmailScreen: 'notification_settings_email.screen',
        backButton: 'screen.back.button',
        immediatelyAction: 'notification_settings_email.immediately.action',
        immediatelyActionSelected: 'notification_settings_email.immediately.action.selected',
        neverAction: 'notification_settings_email.never.action',
        neverActionSelected: 'notification_settings_email.never.action.selected',

        // ANDROID ONLY
        sendAction: 'notification_settings_email.send.action',
        sendActionDescription: 'notification_settings_email.send.action.description',
        sendActionLabel: 'notification_settings_email.send.action.label',
        sendModal: 'notification_settings_email.send.modal',
        sendModalCancelButton: 'notification_settings_email.send_modal_cancel.button',
        sendModalSaveButton: 'notification_settings_email.send_modal_save.button',
    }

    notificationSettingsEmailScreen = element(by.id(this.testID.notificationSettingsEmailScreen));
    backButton = element(by.id(this.testID.backButton));
    immediatelyAction = element(by.id(this.testID.immediatelyAction));
    immediatelyActionSelected = element(by.id(this.testID.immediatelyActionSelected));
    neverAction = element(by.id(this.testID.neverAction));
    neverActionSelected = element(by.id(this.testID.neverActionSelected));

    // ANDROID ONLY
    sendAction = element(by.id(this.testID.sendAction));
    sendActionDescription = element(by.id(this.testID.sendActionDescription));
    sendActionLabel = element(by.id(this.testID.sendActionLabel));
    sendModal = element(by.id(this.testID.sendModal));
    sendModalCancelButton = element(by.id(this.testID.sendModalCancelButton));
    sendModalSaveButton = element(by.id(this.testID.sendModalSaveButton));

    getSendActionFor = (sendKey) => {
        switch (sendKey) {
        case 'immediately':
            return this.immediatelyAction;
        case 'never':
            return this.neverAction;
        default:
            throw new Error('Not a valid send option: ' + sendKey);
        }
    }

    toBeVisible = async () => {
        await expect(this.notificationSettingsEmailScreen).toBeVisible();

        return this.notificationSettingsEmailScreen;
    }

    open = async () => {
        // # Open notification settings email screen
        await NotificationSettingsScreen.emailAction.tap();

        return this.toBeVisible();
    }

    back = async () => {
        await this.backButton.tap();
        await expect(this.notificationSettingsEmailScreen).not.toBeVisible();
    }
}

const notificationSettingsEmailScreen = new NotificationSettingsEmailScreen();
export default notificationSettingsEmailScreen;
