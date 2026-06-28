// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isAndroid, isIos, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

class ChannelBookmarkScreen {
    testID = {
        channelBookmarkScreen: 'channel_bookmark.screen',
        closeButton: 'close.channel_bookmark.button',
        saveButton: 'channel_bookmark.edit.save_button',
        linkInput: 'channel_bookmark_add.link.input',
        linkLoading: 'channel_bookmark_add.link.loading',
        linkInputDescription: 'channel_bookmark_add.link.input.description',
        titleInput: 'channel_bookmark.add.title.input',
    };

    channelBookmarkScreen = element(by.id(this.testID.channelBookmarkScreen));
    closeButton = element(by.id(this.testID.closeButton));

    // Aliases kept for call sites that reference the add/edit variants.
    get closeAddButton() {
        return this.closeButton;
    }
    get closeEditButton() {
        return this.closeButton;
    }
    saveButton = element(by.id(this.testID.saveButton));
    linkInput = element(by.id(this.testID.linkInput));
    linkLoading = element(by.id(this.testID.linkLoading));
    linkInputDescription = element(by.id(this.testID.linkInputDescription));
    titleInput = element(by.id(this.testID.titleInput));

    // Bottom sheet options — use testIDs (by.text is unreliable on Android gorhom sheets).
    addALinkOption = element(by.id('channel_bookmark.type.link'));
    attachAFileOption = element(by.id('channel_bookmark.type.file'));
    addLinkOptionLabel = element(by.text('Add a link'));
    attachFileOptionLabel = element(by.text('Attach a file'));

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

    waitForTitleInputReady = async (timeout = timeouts.TEN_SEC) => {
        await waitFor(this.titleInput).toExist().withTimeout(timeout);
        return this.titleInput;
    };

    waitForAddLinkSheet = async (timeout = timeouts.TEN_SEC) => {
        await waitFor(this.addALinkOption).toExist().withTimeout(timeout);
    };

    tapAddLink = async () => {
        await this.waitForAddLinkSheet();
        await this.addALinkOption.tap();
        await this.toBeVisible();
    };

    // Android Detox replaceText often skips onChangeText, leaving Save disabled (CI MM-T5602 screenshot).
    fillLinkAndTitle = async (url: string, title: string) => {
        await this.runUnsynchronized(async () => {
            const linkInput = this.getLinkInput();
            await linkInput.tap();
            if (isAndroid()) {
                await linkInput.clearText();
                await linkInput.typeText(url);
            } else {
                await linkInput.replaceText(url);
            }
            await this.waitForLinkLoadingToFinish();
            const titleInput = await this.waitForTitleInputReady();
            await titleInput.tap();
            if (isAndroid()) {
                await titleInput.clearText();
                await titleInput.typeText(title);
            } else {
                await titleInput.replaceText(title);
            }
            await this.waitForTitleValue(title);
        });
    };

    tapSave = async () => {
        if (isIos()) {
            await waitFor(this.saveButton).toExist().withTimeout(timeouts.TEN_SEC);
            await this.saveButton.tap();
            return;
        }

        // Header NavigationButton — tap label text once form validation enables Save.
        const saveHeader = element(by.text('Save'));
        /* eslint-disable no-await-in-loop */
        for (let attempt = 0; attempt < 20; attempt++) {
            try {
                await saveHeader.tap();
                await waitFor(this.channelBookmarkScreen).not.toExist().withTimeout(timeouts.FIVE_SEC);
                return;
            } catch {
                await wait(timeouts.HALF_SEC);
            }
        }
        /* eslint-enable no-await-in-loop */
        throw new Error('tapSave: channelBookmarkScreen did not dismiss after 20 attempts — Save button may be disabled');
    };

    saveLinkBookmark = async (url: string, title: string) => {
        await this.fillLinkAndTitle(url, title);
        await this.tapSave();
    };

    runUnsynchronized = async <T>(action: () => Promise<T>): Promise<T> => {
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
        await waitFor(this.closeButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await this.closeButton.tap();
        await expect(this.channelBookmarkScreen).not.toBeVisible();
    };
}

const channelBookmarkScreen = new ChannelBookmarkScreen();
export default channelBookmarkScreen;
