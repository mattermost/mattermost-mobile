// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {expect} from 'detox';

import {DisplaySettingsScreen} from '@support/ui/screen';
import {isAndroid} from '@support/utils';

class ClockDisplaySettingsScreen {
    testID = {
        clockDisplaySettingsScreen: 'clock_display_settings.screen',
        backButton: 'screen.back.button',
        militaryClockAction: 'clock_display_settings.military_clock.action',
        normalClockAction: 'clock_display_settings.normal_clock.action',

        // ANDROID ONLY
        clockModal: 'clock_display_settings.clock.modal',
        clockModalCancelButton: 'clock_display_settings.clock_modal_cancel.button',
        clockModalSaveButton: 'clock_display_settings.clock_modal_save.button',
    };

    clockDisplaySettingsScreen = element(by.id(this.testID.clockDisplaySettingsScreen));
    backButton = element(by.id(this.testID.backButton));
    militaryClockAction = element(by.id(this.testID.militaryClockAction));
    normalClockAction = element(by.id(this.testID.normalClockAction));

    // ANDROID ONLY
    clockModal = element(by.id(this.testID.clockModal));
    clockModalCancelButton = element(by.id(this.testID.clockModalCancelButton));
    clockModalSaveButton = element(by.id(this.testID.clockModalSaveButton));

    getClockActionFor = (clockKey) => {
        switch (clockKey) {
        case 'military':
            return this.militaryClockAction;
        case 'normal':
            return this.normalClockAction;
        default:
            throw new Error('Not a valid clock option: ' + clockKey);
        }
    };

    toBeVisible = async () => {
        if (isAndroid()) {
            await expect(this.clockModal).toBeVisible();
            return this.clockModal;
        }

        await expect(this.clockDisplaySettingsScreen).toBeVisible();
        return this.clockDisplaySettingsScreen;
    };

    open = async () => {
        // # Open clock display settings screen
        await DisplaySettingsScreen.clockDisplayAction.tap();

        return this.toBeVisible();
    };

    back = async () => {
        await this.backButton.tap();
        await expect(this.clockDisplaySettingsScreen).not.toBeVisible();
    };
}

const clockDisplaySettingsScreen = new ClockDisplaySettingsScreen();
export default clockDisplaySettingsScreen;
