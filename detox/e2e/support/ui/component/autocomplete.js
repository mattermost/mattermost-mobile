// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class Autocomplete {
    testID = {
        autocomplete: 'autocomplete',
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
        return element(by.id(`autocomplete.at_mention.item.${userId}`));
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
