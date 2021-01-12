// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class SettingsSidebar {
    testID = {
        settingsSidebar: 'settings.sidebar',
        userInfoAction: 'settings.sidebar.user_info.action',
        statusAction: 'settings.sidebar.status.action',
        recentMentionsAction: 'settings.sidebar.recent_mentions.action',
        savedMessagesAction: 'settings.sidebar.saved_messages.action',
        editProfileAction: 'settings.sidebar.edit_profile.action',
        settingsAction: 'settings.sidebar.settings.action',
        logoutAction: 'settings.sidebar.logout.action',
    }

    settingsSidebar = element(by.id(this.testID.settingsSidebar));
    userInfoAction = element(by.id(this.testID.userInfoAction));
    statusAction = element(by.id(this.testID.statusAction));
    recentMentionsAction = element(by.id(this.testID.recentMentionsAction));
    savedMessagesAction = element(by.id(this.testID.savedMessagesAction));
    editProfileAction = element(by.id(this.testID.editProfileAction));
    settingsAction = element(by.id(this.testID.settingsAction));
    logoutAction = element(by.id(this.testID.logoutAction));

    toBeVisible = async () => {
        await expect(this.settingsSidebar).toBeVisible();

        return this.settingsSidebar;
    }

    tapLogoutAction = async () => {
        await this.logoutAction.tap();
        await expect(this.settingsSidebar).not.toBeVisible();
    }
}

const settingsSidebar = new SettingsSidebar();
export default settingsSidebar;
