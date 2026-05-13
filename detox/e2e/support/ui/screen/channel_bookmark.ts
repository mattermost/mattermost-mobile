// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {timeouts} from '@support/utils';
import {expect, waitFor} from 'detox';

class ChannelBookmarkScreen {
    testID = {
        channelBookmarkScreen: 'channel_bookmark.screen',
        closeAddButton: 'close.channel_bookmark_add.button',
        closeEditButton: 'close.channel_bookmark_edit.button',
        saveButton: 'channel_bookmark.edit.save_button',
        linkInput: 'channel_bookmark_add.link.input',
        linkLoading: 'channel_bookmark_add.link.loading',
        linkInputDescription: 'channel_bookmark_add.link.input.description',
        titleInput: 'channel_bookmark_add.title.input',
    };

    channelBookmarkScreen = element(by.id(this.testID.channelBookmarkScreen));
    closeAddButton = element(by.id(this.testID.closeAddButton));
    closeEditButton = element(by.id(this.testID.closeEditButton));
    saveButton = element(by.id(this.testID.saveButton));
    linkInput = element(by.id(this.testID.linkInput));
    linkLoading = element(by.id(this.testID.linkLoading));
    linkInputDescription = element(by.id(this.testID.linkInputDescription));
    titleInput = element(by.id(this.testID.titleInput));

    // Add bookmark bottom sheet options (by text)
    addALinkOption = element(by.text('Add a link'));
    attachAFileOption = element(by.text('Attach a file'));

    // Edit options (long press on bookmark)
    editOption = element(by.text('Edit'));
    deleteOption = element(by.text('Delete'));
    copyLinkOption = element(by.text('Copy Link'));

    // Delete confirmation alert
    deleteConfirmYesButton = element(by.text('Yes'));
    deleteConfirmCancelButton = element(by.text('Cancel'));

    // Error alert button
    errorOkButton = element(by.text('OK'));

    getLinkInput = () => this.linkInput;
    getTitleInput = () => this.titleInput;

    waitForTitleValue = async (value: string, timeout = timeouts.ONE_MIN) => {
        if (device.getPlatform() === 'ios') {
            await waitFor(this.titleInput).toHaveValue(value).withTimeout(timeout);
            return;
        }

        await waitFor(this.titleInput).toHaveText(value).withTimeout(timeout);
    };

    getTitleValue = async () => {
        const titleAttributes = await this.titleInput.getAttributes();
        const titleAttributeRecord = titleAttributes as unknown as Record<string, string | undefined>;

        return String(
            titleAttributeRecord.text ??
            titleAttributeRecord.value ??
            '',
        ).trim();
    };

    waitForAutofilledTitle = async (expectedPrefix = 'Mattermost', timeout = timeouts.ONE_MIN): Promise<string> => {
        const deadline = Date.now() + timeout;
        let lastTitle = '';
        /* eslint-disable no-await-in-loop */
        while (Date.now() < deadline) {
            try {
                lastTitle = await this.getTitleValue();
                if (lastTitle && lastTitle.startsWith(expectedPrefix)) {
                    return lastTitle;
                }
            } catch {
                // titleInput may not exist yet; keep polling
            }
            await new Promise((r) => setTimeout(r, 500));
        }
        /* eslint-enable no-await-in-loop */
        throw new Error(`Timed out waiting for title starting with "${expectedPrefix}". Last value: "${lastTitle}"`);
    };

    waitForLinkLoadingToFinish = async (timeout = timeouts.ONE_MIN) => {
        await waitFor(this.linkLoading).not.toExist().withTimeout(timeout);
    };

    runUnsynchronized = async <T>(action: () => Promise<T>): Promise<T> => {
        if (device.getPlatform() !== 'ios') {
            return action();
        }

        await device.disableSynchronization();

        try {
            return await action();
        } finally {
            await device.enableSynchronization();
        }
    };

    toBeVisible = async () => {
        await waitFor(this.channelBookmarkScreen).toExist().withTimeout(timeouts.TEN_SEC);
        return this.channelBookmarkScreen;
    };

    close = async () => {
        try {
            await waitFor(this.closeAddButton).toBeVisible().withTimeout(timeouts.TWO_SEC);
            await this.closeAddButton.tap();
        } catch {
            await waitFor(this.closeEditButton).toBeVisible().withTimeout(timeouts.TWO_SEC);
            await this.closeEditButton.tap();
        }
        await expect(this.channelBookmarkScreen).not.toBeVisible();
    };
}

const channelBookmarkScreen = new ChannelBookmarkScreen();
export default channelBookmarkScreen;
