// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from '@support/ui/component';
import {isAndroid, isIos, longPressWithRetry, safeEnableSynchronization, timeouts, wait, waitForElementToNotExist} from '@support/utils';
import {expect, waitFor} from 'detox';

class PostOptionsScreen {
    testID = {
        reactionEmojiPrefix: 'post_options.reaction_bar.reaction.',
        postOptionsScreen: 'post_options.screen',
        pickReactionButton: 'post_options.reaction_bar.pick_reaction.button',
        replyPostOption: 'post_options.reply_post.option',
        followThreadOption: 'post_options.follow_thread.option',
        followingThreadOption: 'post_options.following_thread.option',
        markAsUnreadOption: 'post_options.mark_as_unread.option',
        copyLinkOption: 'post_options.copy_permalink.option',
        savePostOption: 'post_options.Save_post.option',
        unsavePostOption: 'post_options.Unsave_post.option',
        copyTextOption: 'post_options.copy_text.option',
        pinPostOption: 'post_options.pin_post.option',
        unpinPostOption: 'post_options.unpin_post.option',
        editPostOption: 'post_options.edit_post.option',
        deletePostOption: 'post_options.delete_post.option',
        pinnedPostListItemPrefix: 'pinned_messages.post_list.post',
    };

    searchedPostListItem = (postId: string) => element(by.id(`search_results.post_list.post.${postId}`));
    pinnedPostListItem = (postId: string) => element(by.id(`pinned_messages.post_list.post.${postId}`));
    postOptionsScreen = element(by.id(this.testID.postOptionsScreen));
    pickReactionButton = element(by.id(this.testID.pickReactionButton));
    replyPostOption = element(by.id(this.testID.replyPostOption));
    followThreadOption = element(by.id(this.testID.followThreadOption));
    followingThreadOption = element(by.id(this.testID.followingThreadOption));
    markAsUnreadOption = element(by.id(this.testID.markAsUnreadOption));
    copyLinkOption = element(by.id(this.testID.copyLinkOption));
    savePostOption = element(by.id(this.testID.savePostOption));
    savePostOptionLabel = element(by.id(`${this.testID.savePostOption}.label`));
    unsavePostOption = element(by.id(this.testID.unsavePostOption));
    unsavePostOptionLabel = element(by.id(`${this.testID.unsavePostOption}.label`));
    copyTextOption = element(by.id(this.testID.copyTextOption));
    pinPostOption = element(by.id(this.testID.pinPostOption));
    pinPostOptionLabel = element(by.id(`${this.testID.pinPostOption}.label`));
    unpinPostOption = element(by.id(this.testID.unpinPostOption));
    unpinPostOptionLabel = element(by.id(`${this.testID.unpinPostOption}.label`));
    editPostOption = element(by.id(this.testID.editPostOption));
    deletePostOption = element(by.id(this.testID.deletePostOption));

    getReactionEmoji = (emojiName: string) => {
        return element(by.id(`${this.testID.reactionEmojiPrefix}${emojiName}`));
    };

    toBeVisible = async () => {
        const timeout = isAndroid() ? timeouts.TWENTY_SEC : timeouts.TEN_SEC;
        await waitFor(this.postOptionsScreen).toExist().withTimeout(timeout);

        return postOptionsScreen;
    };

    close = async () => {
        if (isIos()) {
            await this.postOptionsScreen.swipe('down');
        } else {
            await device.pressBack();
            try {
                await waitFor(this.postOptionsScreen).not.toExist().withTimeout(timeouts.TWO_SEC);
            } catch {
                await device.pressBack();
            }
        }
        await waitFor(this.postOptionsScreen).not.toExist().withTimeout(timeouts.FIVE_SEC);
    };

    deletePost = async ({confirm = true} = {}) => {
        await waitFor(this.deletePostOption).toExist().withTimeout(timeouts.TWO_SEC);
        await this.deletePostOption.tap({x: 1, y: 1});
        const {
            deletePostTitle,
            cancelButton,
            deleteButton,
        } = Alert;
        await expect(deletePostTitle).toBeVisible();
        await expect(cancelButton).toBeVisible();
        await expect(deleteButton).toBeVisible();
        if (confirm) {
            await deleteButton.tap();
            try {
                await waitForElementToNotExist(this.postOptionsScreen, timeouts.TEN_SEC);
            } catch {
                await this.close();
                await waitForElementToNotExist(this.postOptionsScreen, timeouts.FIVE_SEC);
            }
        } else {
            await cancelButton.tap();
            await wait(timeouts.TWO_SEC);
            await waitFor(this.postOptionsScreen).toExist().withTimeout(timeouts.FIVE_SEC);
            await this.close();
        }
    };

    replyToPost = async () => {
        await waitFor(this.replyPostOption).toExist().withTimeout(timeouts.TWO_SEC);
        await this.replyPostOption.tap();
        try {
            await waitForElementToNotExist(this.postOptionsScreen, timeouts.TEN_SEC);
        } catch {
            await this.close();
        }
    };

    openPostOptionsForPinedPosts = async (postId: string) => {
        await waitFor(this.pinnedPostListItem(postId)).toExist().withTimeout(timeouts.TEN_SEC);
        await longPressWithRetry(this.pinnedPostListItem(postId), this.postOptionsScreen);
    };

    openPostOptionsForSearchedPosts = async (postId: string) => {
        await waitFor(this.searchedPostListItem(postId)).toExist().withTimeout(timeouts.TEN_SEC);
        await longPressWithRetry(this.searchedPostListItem(postId), this.postOptionsScreen);
    };

    private tapPostOption = async (
        option: Detox.NativeElement,
        optionLabel: Detox.NativeElement,
        labelText: string,
    ) => {
        await this.toBeVisible();

        if (isIos()) {
            await option.tap();
            return;
        }

        // Android gorhom sheets + edge-to-edge: testID visibility can fail while the
        // label text is hittable (CI MM-T4864 testFnFailure — Save visible, matcher not).
        await device.disableSynchronization();
        try {
            const candidates = [
                optionLabel,
                option,
                element(by.text(labelText).withAncestor(by.id(this.testID.postOptionsScreen))),
            ];
            /* eslint-disable no-await-in-loop */
            for (const candidate of candidates) {
                try {
                    await waitFor(candidate).toExist().withTimeout(timeouts.TWO_SEC);
                    await candidate.tap();
                    return;
                } catch {
                    // try next matcher
                }
            }
            /* eslint-enable no-await-in-loop */
            await optionLabel.tap();
        } finally {
            await safeEnableSynchronization();
        }
    };

    tapSavePost = async () => {
        await this.tapPostOption(this.savePostOption, this.savePostOptionLabel, 'Save');
    };

    tapUnsavePost = async () => {
        await this.tapPostOption(this.unsavePostOption, this.unsavePostOptionLabel, 'Unsave');
    };
}

const postOptionsScreen = new PostOptionsScreen();
export default postOptionsScreen;
