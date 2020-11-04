// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class SettingsSidebar {
    testID = {
        settingsSidebar: 'settings.sidebar',
        settingsAction: 'settings.sidebar.settings.action',
        logoutAction: 'settings.sidebar.logout.action',
    }

    settingsSidebar = element(by.id(this.testID.settingsSidebar));
    settingsAction = element(by.id(this.testID.settingsAction));
    logoutAction = element(by.id(this.testID.logoutAction));

    toBeVisible = async () => {
        await expect(element(by.id(this.testID.settingsSidebar))).toBeVisible();

        return this.settingsSidebar;
    }
}

const settingsSidebar = new SettingsSidebar();
export default settingsSidebar;
