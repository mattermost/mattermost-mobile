// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class ReactionListScreen {
    testID = {
        reactionRowPrefix: 'reaction_row.',
        reactionListScreen: 'reaction_list.screen',
    }

    reactionListScreen = element(by.id(this.testID.reactionListScreen));

    toBeVisible = async () => {
        await expect(this.reactionListScreen).toExist();

        return reactionListScreen;
    }

    close = async () => {
        await this.reactionListScreen.tap({x: 5, y: 10});
        await expect(this.reactionListScreen).not.toBeVisible();
    }

    getReactionRow = (userId, emojiName) => {
        const reactionRowEmojiMatcher = by.id(`${this.testID.reactionRowPrefix}emoji.${emojiName}.${userId}`);
        const reactionRowProfilePictureMatcher = by.id(`${this.testID.reactionRowPrefix}profile_picture.${userId}`);
        const reactionRowUserMatcher = by.id(`${this.testID.reactionRowPrefix}user.${userId}`);

        return {
            reactionRowEmoji: element(reactionRowEmojiMatcher),
            reactionRowProfilePicture: element(reactionRowProfilePictureMatcher),
            reactionRowUser: element(reactionRowUserMatcher),
        };
    }
}

const reactionListScreen = new ReactionListScreen();
export default reactionListScreen;
