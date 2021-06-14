// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class Autocomplete {
    testID = {
        atMentionItemPrefix: 'autocomplete.at_mention.item.',
        channelMentionItemPrefix: 'autocomplete.channel_mention.item.',
        autocomplete: 'autocomplete',
        atMentionItemName: 'at_mention_item.name',
        atMentionItemProfilePicture: 'at_mention_item.profile_picture',
        atMentionItemUsername: 'at_mention_item.username',
        atMentionSuggestionList: 'at_mention_suggestion.list',
        channelMentionSuggestionList: 'channel_mention_suggestion.list',
        dateSuggestion: 'autocomplete.date_suggestion',
        emojiSuggestionList: 'emoji_suggestion.list',
        slashSuggestionList: 'slash_suggestion.list',
    }

    autocomplete = element(by.id(this.testID.autocomplete));
    atMentionSuggestionList = element(by.id(this.testID.atMentionSuggestionList));
    channelMentionSuggestionList = element(by.id(this.testID.channelMentionSuggestionList));
    dateSuggestion = element(by.id(this.testID.dateSuggestion));
    emojiSuggestionList = element(by.id(this.testID.emojiSuggestionList));
    slashSuggestionList = element(by.id(this.testID.slashSuggestionList));

    getAtMentionItem = (userId) => {
        const atMentionItemMatcher = by.id(`${this.testID.atMentionItemPrefix}${userId}`);
        const atMentionItemNameMatcher = by.id(this.testID.atMentionItemName).withAncestor(atMentionItemMatcher);
        const atMentionItemProfilePictureMatcher = by.id(this.testID.atMentionItemProfilePicture).withAncestor(atMentionItemMatcher);
        const atMentionItemUsernameMatcher = by.id(this.testID.atMentionItemUsername).withAncestor(atMentionItemMatcher);

        return {
            atMentionItem: element(atMentionItemMatcher),
            atMentionItemName: element(atMentionItemNameMatcher),
            atMentionItemProfilePicture: element(atMentionItemProfilePictureMatcher),
            atMentionItemUsername: element(atMentionItemUsernameMatcher),
        };
    }

    getChannelMentionItem = (channelId) => {
        return element(by.id(`${this.testID.channelMentionItemPrefix}${channelId}`));
    }

    toBeVisible = async (isVisible = true) => {
        if (isVisible) {
            await expect(this.autocomplete.atIndex(0)).toBeVisible();
            return this.autocomplete;
        }

        await expect(this.autocomplete).not.toBeVisible();
        return null;
    }
}

const autocomplete = new Autocomplete();
export default autocomplete;
