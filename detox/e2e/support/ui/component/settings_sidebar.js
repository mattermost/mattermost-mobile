// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import BottomSheet from './bottom_sheet';

class SettingsSidebar {
    testID = {
        userStatusIconPrefix: 'user_status.icon.',
        userStatusLabelPrefix: 'user_status.label.',
        settingsSidebar: 'settings.sidebar',
        userInfoAction: 'settings.sidebar.user_info.action',
        statusAction: 'settings.sidebar.status.action',
        recentMentionsAction: 'settings.sidebar.recent_mentions.action',
        savedMessagesAction: 'settings.sidebar.saved_messages.action',
        editProfileAction: 'settings.sidebar.edit_profile.action',
        settingsAction: 'settings.sidebar.settings.action',
        logoutAction: 'settings.sidebar.logout.action',
        customStatusAction: 'settings.sidebar.custom_status.action',
        customStatusClearButton: 'settings.sidebar.custom_status.action.clear',
    }

    settingsSidebar = element(by.id(this.testID.settingsSidebar));
    userInfoAction = element(by.id(this.testID.userInfoAction));
    statusAction = element(by.id(this.testID.statusAction));
    recentMentionsAction = element(by.id(this.testID.recentMentionsAction));
    savedMessagesAction = element(by.id(this.testID.savedMessagesAction));
    editProfileAction = element(by.id(this.testID.editProfileAction));
    settingsAction = element(by.id(this.testID.settingsAction));
    logoutAction = element(by.id(this.testID.logoutAction));
    customStatusAction = element(by.id(this.testID.customStatusAction));
    customStatusClearButton = element(by.id(this.testID.customStatusClearButton));

    getUserStatus(userStatus) {
        const userStatusIconTestID = `${this.testID.userStatusIconPrefix}${userStatus}`;
        const userStatusLabelTestID = `${this.testID.userStatusLabelPrefix}${userStatus}`;

        return {
            userStatusIcon: element(by.id(userStatusIconTestID)),
            userStatusLabel: element(by.id(userStatusLabelTestID)),
        };
    }

    toBeVisible = async () => {
        await expect(this.settingsSidebar).toBeVisible();

        return this.settingsSidebar;
    }

    setUserStatusTo = async (userStatus) => {
        const {
            awayOption,
            doNotDisturbOption,
            offlineOption,
            onlineOption,
        } = BottomSheet;

        // # Set user status
        await this.statusAction.tap();
        switch (userStatus) {
        case 'online':
            await onlineOption.tap();
            break;
        case 'away':
            await awayOption.tap();
            break;
        case 'dnd':
            await doNotDisturbOption.tap();
            break;
        case 'offline':
            await offlineOption.tap();
            break;
        default:
            throw new Error('Not a valid user status option: ' + userStatus);
        }

        // * Verify user status
        const {userStatusIcon, userStatusLabel} = this.getUserStatus(userStatus);
        await expect(userStatusIcon).toBeVisible();
        await expect(userStatusLabel).toBeVisible();
    }

    tapLogoutAction = async () => {
        await this.logoutAction.tap();
        await expect(this.settingsSidebar).not.toBeVisible();
    }

    tapCustomStatusAction = async () => {
        await this.customStatusAction.tap();
        await expect(this.settingsSidebar).not.toBeVisible();
    }
}

const settingsSidebar = new SettingsSidebar();
export default settingsSidebar;
