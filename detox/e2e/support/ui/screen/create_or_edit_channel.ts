// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    ChannelInfoScreen,
    ChannelScreen,
    ChannelListScreen,
    ChannelSettingsScreen,
} from '@support/ui/screen';
import {getRandomId, isIos, tapNativeBackButton, timeouts, wait, waitForElementToBeVisible} from '@support/utils';
import {expect, waitFor} from 'detox';

class CreateOrEditChannelScreen {
    testID = {
        createOrEditChannelScreen: 'create_or_edit_channel.screen',
        closeButton: 'close.create_or_edit_channel.button',
        backButton: 'navigation.header.back',
        createButton: 'create_or_edit_channel.create.button',
        saveButton: 'create_or_edit_channel.save.button',
        scrollView: 'create_or_edit_channel.scroll_view',
        makePrivateToggledOff: 'channel_info_form.make_private.toggled.false.button',
        makePrivateToggledOn: 'channel_info_form.make_private.toggled.true.button',
        makePrivateDescription: 'channel_info_form.make_private.description',
        displayNameInput: 'channel_info_form.display_name.input',
        purposeInput: 'channel_info_form.purpose.input',
        purposeDescription: 'channel_info_form.purpose.description',
        headerInput: 'channel_info_form.header.input',
        headerDescription: 'channel_info_form.header.description',
    };

    createOrEditChannelScreen = element(by.id(this.testID.createOrEditChannelScreen));
    closeButton = element(by.id(this.testID.closeButton));
    backButton = element(by.id(this.testID.backButton));
    createButton = element(by.id(this.testID.createButton));
    saveButton = element(by.id(this.testID.saveButton));
    scrollView = element(by.id(this.testID.scrollView));
    makePrivateToggledOff = element(by.id(this.testID.makePrivateToggledOff));
    makePrivateToggledOn = element(by.id(this.testID.makePrivateToggledOn));
    makePrivateDescription = element(by.id(this.testID.makePrivateDescription));
    displayNameInput = element(by.id(this.testID.displayNameInput));
    purposeInput = element(by.id(this.testID.purposeInput));
    purposeDescription = element(by.id(this.testID.purposeDescription));
    headerInput = element(by.id(this.testID.headerInput));
    headerDescription = element(by.id(this.testID.headerDescription));

    toBeVisible = async () => {
        await waitFor(this.createOrEditChannelScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.createOrEditChannelScreen;
    };

    openCreateChannel = async () => {
        if (isIos()) {
            try {
                await waitFor(element(by.text('Not Now'))).toBeVisible().withTimeout(3000);
                await element(by.text('Not Now')).tap();
            } catch {
                // No system alert.
            }
        }

        await ChannelListScreen.openPlusMenu();
        await waitForElementToBeVisible(ChannelListScreen.createNewChannelItem, timeouts.TEN_SEC);
        await ChannelListScreen.createNewChannelItem.tap();

        return this.toBeVisible();
    };

    openEditChannel = async () => {
        // # Open edit channel screen (Channel Info > Channel Settings > Channel info)
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();
        await ChannelSettingsScreen.channelInfoOption.tap({x: 1, y: 1});

        return this.toBeVisible();
    };

    openEditChannelHeader = async ({fromChannelInfo = false} = {}) => {
        // # Open edit channel header screen
        if (fromChannelInfo) {
            await ChannelInfoScreen.setHeaderAction.tap();
        } else {
            await ChannelScreen.introSetHeaderAction.tap();
        }

        return this.toBeVisible();
    };

    back = async () => {
        await tapNativeBackButton();
        await expect(this.createOrEditChannelScreen).not.toBeVisible();
    };

    close = async () => {
        await this.closeButton.tap();
        await expect(this.createOrEditChannelScreen).not.toBeVisible();
    };

    save = async () => {
        // The save button sits in the modal header, above the keyboard. A blind pressBack here
        // dismisses create_or_edit_channel.screen itself and the save button with it.
        await this.saveButton.tap();

        // Save can leave an empty create_or_edit_channel.screen shell that blocks not.toExist, so
        // require the save button to disappear before accepting the destination screen.
        const {channelInfoScreen} = ChannelInfoScreen;
        const {channelSettingsScreen} = ChannelSettingsScreen;
        const startTime = Date.now();
        /* eslint-disable no-await-in-loop */
        while (Date.now() - startTime < timeouts.HALF_MIN) {
            try {
                await expect(this.saveButton).not.toExist();
            } catch {
                await wait(timeouts.HALF_SEC);
                continue;
            }

            try {
                await expect(channelInfoScreen).toExist();
                return;
            } catch {
                /* not on channel info yet */
            }
            try {
                await expect(channelSettingsScreen).toExist();
                return;
            } catch {
                /* not on channel settings yet */
            }

            // Modal dismissed even if destination matcher is still settling.
            return;
        }
        /* eslint-enable no-await-in-loop */

        throw new Error('save: edit channel screen did not dismiss after save');
    };

    toggleMakePrivateOn = async () => {
        await this.makePrivateToggledOff.tap();
        await expect(this.makePrivateToggledOn).toBeVisible();
    };

    toggleMakePrivateOff = async () => {
        await this.makePrivateToggledOn.tap();
        await expect(this.makePrivateToggledOff).toBeVisible();
    };

    // Full create flow with retry: on failure close the form and reopen/refill/create again.
    createChannelAndOpen = async ({makePrivate = false, attempts = 3} = {}) => {
        let lastError: unknown;

        /* eslint-disable no-await-in-loop */
        for (let attempt = 1; attempt <= attempts; attempt++) {
            const suffix = getRandomId();
            const displayName = `Channel ${suffix}`;
            const purpose = `Purpose ${suffix}`;
            const header = `Header ${suffix}`;

            try {
                await this.openCreateChannel();
                if (makePrivate) {
                    await this.toggleMakePrivateOn();
                } else {
                    await expect(this.makePrivateToggledOff).toBeVisible();
                }
                await this.displayNameInput.replaceText(displayName);
                await this.purposeInput.replaceText(purpose);
                await this.headerInput.replaceText(header);
                await this.createButton.tap();

                await waitFor(ChannelScreen.channelScreen).toExist().withTimeout(timeouts.TEN_SEC);
                await ChannelScreen.dismissScheduledPostTooltip();
                await ChannelScreen.toBeVisible();
                return {displayName, purpose, header};
            } catch (error) {
                lastError = error;

                try {
                    await this.close();
                } catch {
                    try {
                        await ChannelListScreen.toBeVisible();
                    } catch {
                        // Continue to next attempt.
                    }
                }

                if (attempt === attempts) {
                    break;
                }
                await wait(timeouts.TWO_SEC);
            }
        }
        /* eslint-enable no-await-in-loop */

        throw lastError ?? new Error(`createChannelAndOpen failed after ${attempts} attempts`);
    };

    clickonCreateButton = async () => {
        await this.createButton.tap();
        try {
            await ChannelScreen.scheduledPostTooltipCloseButton.tap();
        } catch (error) {
            // eslint-disable-next-line no-console
            console.log('Element not visible, skipping click');
        }
    };
}

const createOrEditChannelScreen = new CreateOrEditChannelScreen();
export default createOrEditChannelScreen;
