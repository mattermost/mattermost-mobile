// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {expect} from 'detox';

import {Alert} from '@support/ui/component';
import {GeneralSettingsScreen} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';

class AdvancedSettingsScreen {
    testID = {
        advancedSettingsScreen: 'advanced_settings.screen',
        advancedSettingsScrollView: 'advanced_settings.scroll_view',
        backButton: 'screen.back.button',
        deleteDocumentsAndDataAction: 'advanced_settings.delete_documents_and_data.action',
    };

    advancedSettingsScreen = element(by.id(this.testID.advancedSettingsScreen));
    advancedSettingsScrollView = element(by.id(this.testID.advancedSettingsScrollView));
    backButton = element(by.id(this.testID.backButton));
    deleteDocumentsAndDataAction = element(by.id(this.testID.deleteDocumentsAndDataAction));

    toBeVisible = async () => {
        await expect(this.advancedSettingsScreen).toBeVisible();

        return this.advancedSettingsScreen;
    };

    open = async () => {
        // # Open advanced settings screen
        await GeneralSettingsScreen.advancedAction.tap();

        return this.toBeVisible();
    };

    back = async () => {
        await this.backButton.tap();
        await expect(this.advancedSettingsScreen).not.toBeVisible();
    };

    deleteDocumentsAndData = async ({confirm = true} = {}) => {
        await this.deleteDocumentsAndDataAction.tap();
        const {
            deleteDocumentsAndDataTitle,
            cancelButton,
            deleteButton,
        } = Alert;
        await expect(deleteDocumentsAndDataTitle).toBeVisible();
        await expect(cancelButton).toBeVisible();
        await expect(deleteButton).toBeVisible();
        if (confirm) {
            deleteButton.tap();
            await wait(timeouts.ONE_SEC);
            await expect(this.advancedSettingsScreen).not.toBeVisible();
        } else {
            cancelButton.tap();
            await wait(timeouts.ONE_SEC);
            await expect(this.advancedSettingsScreen).toBeVisible();
        }
    };
}

const advancedSettingsScreen = new AdvancedSettingsScreen();
export default advancedSettingsScreen;
