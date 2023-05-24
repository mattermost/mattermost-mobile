// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

import ProfilePicture from './profile_picture';

class Autocomplete {
    testID = {
        atMentionItemPrefix: 'autocomplete.at_mention_item.',
        groupMentionItemPrefix: 'autocomplete.group_mention_item.',
        specialMentionItemPrefix: 'autocomplete.special_mention_item.',
        channelMentionItemPrefix: 'autocomplete.channel_mention_item.',
        emojiSuggestionItemPrefix: 'autocomplete.emoji_suggestion_item.',
        slashSuggestionItemPrefix: 'autocomplete.slash_suggestion_item.',
        autocomplete: 'autocomplete',
        sectionAtMentionList: 'autocomplete.at_mention.section_list',
        sectionChannelMentionList: 'autocomplete.channel_mention.section_list',
        flatEmojiSuggestionList: 'autocomplete.emoji_suggestion.flat_list',
        flatSlashSuggestionList: 'autocomplete.slash_suggestion.flat_list',
    };

    autocomplete = element(by.id(this.testID.autocomplete));
    sectionAtMentionList = element(by.id(this.testID.sectionAtMentionList));
    sectionChannelMentionList = element(by.id(this.testID.sectionChannelMentionList));
    flatEmojiSuggestionList = element(by.id(this.testID.flatEmojiSuggestionList));
    flatSlashSuggestionList = element(by.id(this.testID.flatSlashSuggestionList));

    getAtMentionItem = (userId: string) => {
        const atMentionItemTestId = `${this.testID.atMentionItemPrefix}${userId}`;
        const atMentionItemMatcher = by.id(atMentionItemTestId);
        const atMentionItemProfilePictureMatcher = ProfilePicture.getProfilePictureItemMatcher(this.testID.atMentionItemPrefix, userId);
        const atMentionItemBotTagMatcher = by.id(`${atMentionItemTestId}.bot.tag`);
        const atMentionItemGuestTagMatcher = by.id(`${atMentionItemTestId}.guest.tag`);
        const atMentionItemUserDisplayNameMatcher = by.id(`${atMentionItemTestId}.display_name`);
        const atMentionItemCurrentUserIndicatorMatcher = by.id(`${atMentionItemTestId}.current_user_indicator`);
        const atMentionItemUsernameMatcher = by.id(`${atMentionItemTestId}.username`);

        return {
            atMentionItem: element(atMentionItemMatcher),
            atMentionItemProfilePicture: element(atMentionItemProfilePictureMatcher),
            atMentionItemBotTag: element(atMentionItemBotTagMatcher),
            atMentionItemGuestTag: element(atMentionItemGuestTagMatcher),
            atMentionItemUserDisplayName: element(atMentionItemUserDisplayNameMatcher),
            atMentionItemCurrentUserIndicator: element(atMentionItemCurrentUserIndicatorMatcher),
            atMentionItemUsername: element(atMentionItemUsernameMatcher),
        };
    };

    getGrouptMentionItem = (groupName: string) => {
        const groupMentionItemTestId = `${this.testID.groupMentionItemPrefix}${groupName}`;
        const groupMentionItemMatcher = by.id(groupMentionItemTestId);
        const groupMentionItemGroupDisplayNameMatcher = by.id(`${groupMentionItemTestId}.display_name`);
        const groupMentionItemGroupNameMatcher = by.id(`${groupMentionItemTestId}.name`);

        return {
            groupMentionItem: element(groupMentionItemMatcher),
            groupMentionItemGroupDisplayName: element(groupMentionItemGroupDisplayNameMatcher),
            groupMentionItemGroupName: element(groupMentionItemGroupNameMatcher),
        };
    };

    getSpecialMentionItem = (handleName: string) => {
        const specialMentionItemTestId = `${this.testID.specialMentionItemPrefix}${handleName}`;
        const specialMentionItemMatcher = by.id(specialMentionItemTestId);
        const specialMentionItemGroupDisplayNameMatcher = by.id(`${specialMentionItemTestId}.display_name`);
        const specialMentionItemGroupNameMatcher = by.id(`${specialMentionItemTestId}.name`);

        return {
            specialMentionItem: element(specialMentionItemMatcher),
            specialMentionItemGroupDisplayName: element(specialMentionItemGroupDisplayNameMatcher),
            specialMentionItemGroupName: element(specialMentionItemGroupNameMatcher),
        };
    };

    getChannelMentionItem = (channelName: string) => {
        const channelMentionItemTestId = `${this.testID.channelMentionItemPrefix}${channelName}`;
        const channelMentionItemMatcher = by.id(channelMentionItemTestId);
        const channelMentionItemChannelDisplayNameMatcher = by.id(`${channelMentionItemTestId}.display_name`);
        const channelMentionItemChannelNameMatcher = by.id(`${channelMentionItemTestId}.name`);

        return {
            channelMentionItem: element(channelMentionItemMatcher),
            channelMentionItemChannelDisplayName: element(channelMentionItemChannelDisplayNameMatcher),
            channelMentionItemChannelName: element(channelMentionItemChannelNameMatcher),
        };
    };

    getEmojiSuggestionItem = (emojiName: string) => {
        const emojiSuggestionItemTestId = `${this.testID.emojiSuggestionItemPrefix}${emojiName}`;
        const emojiSuggestionItemMatcher = by.id(emojiSuggestionItemTestId);
        const emojiSuggestionItemEmojiNameMatcher = by.id(`${emojiSuggestionItemTestId}.name`);

        return {
            emojiSuggestionItem: element(emojiSuggestionItemMatcher),
            emojiSuggestionItemEmojiName: element(emojiSuggestionItemEmojiNameMatcher),
        };
    };

    getSlashSuggestionItem = (slashCommand: string) => {
        const slashSuggestionItemTestId = `${this.testID.slashSuggestionItemPrefix}/${slashCommand}`;
        const slashSuggestionItemMatcher = by.id(slashSuggestionItemTestId);
        const slashSuggestionItemSlashCommandNameMatcher = by.id(`${slashSuggestionItemTestId}.name`);
        const slashSuggestionItemSlashCommandDescriptionMatcher = by.id(`${slashSuggestionItemTestId}.description`);

        return {
            slashSuggestionItem: element(slashSuggestionItemMatcher),
            slashSuggestionItemSlashCommandName: element(slashSuggestionItemSlashCommandNameMatcher),
            slashSuggestionItemSlashCommandDescription: element(slashSuggestionItemSlashCommandDescriptionMatcher),
        };
    };

    toBeVisible = async (isVisible = true) => {
        await wait(timeouts.ONE_SEC);
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
