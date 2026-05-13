// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    ChannelInfoScreen,
    ChannelScreen,
    ChannelListScreen,
    ChannelSettingsScreen,
} from '@support/ui/screen';
import {isIos, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

class CreateOrEditChannelScreen {
    testID = {
        createOrEditChannelScreen: 'create_or_edit_channel.screen',
        closeButton: 'close.create_or_edit_channel.button',
        backButton: 'screen.back.button',
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
        // Dismiss any lingering iOS system alert (e.g. "Save Password?") that may
        // block taps on the channel list header. On iOS 26.x the alert can appear
        // after the login flow's own dismissal attempt has timed out.
        if (isIos()) {
            try {
                await waitFor(element(by.text('Not Now'))).toBeVisible().withTimeout(3000);
                await element(by.text('Not Now')).tap();

                console.log('[debug:2a0143] openCreateChannel dismissed lingering system alert'); // eslint-disable-line no-console
            } catch {
                // No system alert — proceed normally
            }
        }

        // # Open create channel screen — wait for the button to be hittable before
        // tapping; on iOS a UITransitionView animation overlay can block the tap
        // if the channel list just appeared. Retry up to 3 times with a 1s gap.
        await waitFor(ChannelListScreen.headerPlusButton).toBeVisible().withTimeout(timeouts.HALF_MIN);
        let tapError: unknown;
        /* eslint-disable no-await-in-loop -- sequential retry: each tap must complete before retrying */
        for (let i = 0; i < 3; i++) {
            try {
                await ChannelListScreen.headerPlusButton.tap();
                tapError = undefined;
                break;
            } catch (err) {
                tapError = err;
                await wait(timeouts.ONE_SEC);
            }
        }
        /* eslint-enable no-await-in-loop */
        if (tapError) {
            throw tapError;
        }
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
        await this.backButton.tap();
        await expect(this.createOrEditChannelScreen).not.toBeVisible();
    };

    close = async () => {
        await this.closeButton.tap();
        await expect(this.createOrEditChannelScreen).not.toBeVisible();
    };

    toggleMakePrivateOn = async () => {
        await this.makePrivateToggledOff.tap();
        await expect(this.makePrivateToggledOn).toBeVisible();
    };

    toggleMakePrivateOff = async () => {
        await this.makePrivateToggledOn.tap();
        await expect(this.makePrivateToggledOff).toBeVisible();
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
