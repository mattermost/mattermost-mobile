// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isAndroid, safeEnableSynchronization, timeouts, wait, waitForElementToExist, waitForElementToNotExist} from '@support/utils';
import {waitFor} from 'detox';

class ChannelBookmarkScreen {
    testID = {
        channelBookmarkScreen: 'channel_bookmark.screen',
        closeButton: 'close.channel_bookmark.button',
        saveButton: 'channel_bookmark.edit.save_button',
        editIconButton: 'channel_bookmark.edit.icon_button',
        linkInput: 'channel_bookmark_add.link.input',
        linkLoading: 'channel_bookmark_add.link.loading',
        linkInputDescription: 'channel_bookmark_add.link.input.description',
        titleInput: 'channel_bookmark.add.title.input',
        bookmarkGenericIcon: 'bookmark-generic-icon',
        bookmarkImage: 'bookmark-image',
        bookmarkEmoji: 'bookmark-emoji',
        bookmarkFileIcon: 'bookmark-file-icon',
        emojiPickerScreen: 'emoji_picker.screen',
        emojiPickerSearchInput: 'emoji_picker.search_bar.search.input',
        emojiPickerToolTipCloseButton: 'skin_selector.tooltip.close.button',
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

    // Add bookmark bottom sheet options (by text)
    addALinkOption = element(by.text('Add a link'));
    attachAFileOption = element(by.text('Attach a file'));

    tapAddALinkOption = async () => {
        await waitForElementToExist(this.addALinkOption, timeouts.TEN_SEC);
        await this.addALinkOption.tap();
    };

    // Edit options (long press on bookmark)
    editOption = element(by.text('Edit'));
    deleteOption = element(by.text('Delete'));
    copyLinkOption = element(by.text('Copy Link'));

    // Delete confirmation alert
    deleteConfirmYesButton = element(by.text('Yes'));
    deleteConfirmCancelButton = element(by.text('Cancel'));

    // Error alert
    addErrorTitle = element(by.text('Error adding bookmark'));
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
            await safeEnableSynchronization();
        }
    };

    toBeVisible = async () => {
        await waitForElementToExist(this.channelBookmarkScreen, timeouts.TEN_SEC);
        await waitForElementToExist(this.linkInput, timeouts.TEN_SEC);
        return this.channelBookmarkScreen;
    };

    getEditModalIconButton = () => {
        const ancestor = by.id(this.testID.channelBookmarkScreen);
        return element(by.id(this.testID.bookmarkGenericIcon).withAncestor(ancestor));
    };

    // CI 28416284905 MM-T5606_1: icon tap + EmojiPickerScreen.toBeVisible() timed out
    // with search input null — bottom-sheet animation / sync still busy on Android.
    openEmojiPickerFromEditModal = async () => {
        const iconButton = element(by.id(this.testID.editIconButton).withAncestor(by.id(this.testID.channelBookmarkScreen)));
        const emojiPickerScreen = element(by.id(this.testID.emojiPickerScreen));
        const searchInput = element(by.id(this.testID.emojiPickerSearchInput));
        const toolTipCloseButton = element(by.id(this.testID.emojiPickerToolTipCloseButton));

        if (isAndroid()) {
            await device.disableSynchronization();
        }

        /* eslint-disable no-await-in-loop -- retry icon tap until picker mounts */
        for (let attempt = 0; attempt < 3; attempt++) {
            await iconButton.tap();
            await wait(timeouts.TWO_SEC);
            try {
                await waitFor(emojiPickerScreen).toExist().withTimeout(timeouts.FIVE_SEC);
                break;
            } catch (error) {
                if (attempt === 2) {
                    throw error;
                }
            }
        }
        /* eslint-enable no-await-in-loop */

        try {
            await waitFor(toolTipCloseButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await toolTipCloseButton.tap();
            await wait(timeouts.ONE_SEC);
        } catch {
            // Skin-tone tooltip may not appear.
        }

        await waitFor(searchInput).toExist().withTimeout(timeouts.TWENTY_SEC);
    };

    close = async () => {
        try {
            await waitFor(this.closeButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await this.closeButton.tap();
        } catch {
            if (device.getPlatform() === 'ios') {
                await device.pressBack();
            } else {
                await this.closeButton.tap();
            }
        }
        await waitForElementToNotExist(this.channelBookmarkScreen, timeouts.TWENTY_SEC);
    };
}

const channelBookmarkScreen = new ChannelBookmarkScreen();
export default channelBookmarkScreen;
