// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ProfilePicture} from '@support/ui/component';
import {isIos, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

class ReactionsScreen {
    testID = {
        reactorItemPrefix: 'reactions.reactor_item.',
        reactionsScreen: 'reactions.screen',
        flatReactorsList: 'reactions.reactors_list.flat_list',
    };

    reactionsScreen = element(by.id(this.testID.reactionsScreen));
    flatReactorsList = element(by.id(this.testID.flatReactorsList));

    toBeVisible = async () => {
        await expect(this.reactionsScreen).toExist();

        return reactionsScreen;
    };

    close = async () => {
        if (isIos()) {
            await this.reactionsScreen.swipe('down');
        } else {
            await device.pressBack();
        }
        await wait(timeouts.ONE_SEC);
        await expect(this.reactionsScreen).not.toBeVisible();
        await wait(timeouts.ONE_SEC);
    };

    getReactorItem = (userId: string, emojiName: string) => {
        const reactorItemEmojiAliasesMatcher = by.id(`emoji_aliases.${emojiName}`);
        const reactorItemUserTestId = `${this.testID.reactorItemPrefix}${userId}`;
        const reactorItemUserMatcher = by.id(reactorItemUserTestId);
        const reactorItemUserProfilePictureMatcher = ProfilePicture.getProfilePictureItemMatcher(this.testID.reactorItemPrefix, userId);
        const reactorItemUserDisplayNameMatcher = by.id(`${reactorItemUserTestId}.display_name`);
        const reactorItemUsernameMatcher = by.id(`${reactorItemUserTestId}.username`);

        return {
            reactorItemEmojiAliases: element(reactorItemEmojiAliasesMatcher),
            reactorItemUser: element(reactorItemUserMatcher),
            reactorItemUserProfilePicture: element(reactorItemUserProfilePictureMatcher),
            reactorItemUserDisplayName: element(reactorItemUserDisplayNameMatcher),
            reactorItemUsername: element(reactorItemUsernameMatcher),
        };
    };
}

const reactionsScreen = new ReactionsScreen();
export default reactionsScreen;
