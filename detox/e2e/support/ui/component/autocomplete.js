// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {expect} from 'detox';

import ProfilePicture from './profile_picture';

class Autocomplete {
    testID = {
        atMentionItemPrefix: 'autocomplete.at_mention.item.',
        atMentionItemProfilePicturePrefix: 'at_mention_item.profile_picture.',
        channelMentionItemPrefix: 'autocomplete.channel_mention.item.',
        autocomplete: 'autocomplete',
        atMentionItemText: 'at_mention_item.text',
        atMentionSuggestionList: 'at_mention_suggestion.list',
        channelMentionSuggestionList: 'channel_mention_suggestion.list',
        dateSuggestion: 'autocomplete.date_suggestion',
        emojiSuggestionList: 'emoji_suggestion.list',
        slashSuggestionList: 'slash_suggestion.list',
    };

    autocomplete = element(by.id(this.testID.autocomplete));
    atMentionSuggestionList = element(by.id(this.testID.atMentionSuggestionList));
    channelMentionSuggestionList = element(by.id(this.testID.channelMentionSuggestionList));
    dateSuggestion = element(by.id(this.testID.dateSuggestion));
    emojiSuggestionList = element(by.id(this.testID.emojiSuggestionList));
    slashSuggestionList = element(by.id(this.testID.slashSuggestionList));

    getAtMentionItem = (userId) => {
        const atMentionItemMatcher = by.id(`${this.testID.atMentionItemPrefix}${userId}`);
        const atMentionItemProfilePictureMatcher = ProfilePicture.getProfilePictureItemMatcher(this.testID.atMentionItemProfilePicturePrefix, userId).withAncestor(atMentionItemMatcher);
        const atMentionItemTextMatcher = by.id(this.testID.atMentionItemText).withAncestor(atMentionItemMatcher);

        return {
            atMentionItem: element(atMentionItemMatcher),
            atMentionItemProfilePicture: element(atMentionItemProfilePictureMatcher),
            atMentionItemText: element(atMentionItemTextMatcher),
        };
    };

    getChannelMentionItem = (channelId) => {
        return element(by.id(`${this.testID.channelMentionItemPrefix}${channelId}`));
    };

    toBeVisible = async (isVisible = true) => {
        if (isVisible) {
            await expect(this.autocomplete.atIndex(0)).toBeVisible();
            return this.autocomplete;
        }

        await expect(this.autocomplete).not.toBeVisible();
        return null;
    };
}

const autocomplete = new Autocomplete();
export default autocomplete;
