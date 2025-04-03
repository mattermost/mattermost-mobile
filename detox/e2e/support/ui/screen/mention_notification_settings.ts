// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NotificationSettingsScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

class MentionNotificationSettingsScreen {
    testID = {
        mentionNotificationSettingsScreen: 'mention_notification_settings.screen',
        backButton: 'screen.back.button',
        scrollView: 'mention_notification_settings.scroll_view',
        caseSensitiveFirstNameOptionToggledOff: 'mention_notification_settings.case_sensitive_first_name.option.toggled.false.button',
        caseSensitiveFirstNameOptionToggledOn: 'mention_notification_settings.case_sensitive_first_name.option.toggled.true.button',
        nonCaseSensitiveUsernameOptionToggledOff: 'mention_notification_settings.non_case_sensitive_username.option.toggled.false.button',
        nonCaseSensitiveUsernameOptionToggledOn: 'mention_notification_settings.non_case_sensitive_username.option.toggled.true.button',
        channelWideMentionsOptionToggledOff: 'mention_notification_settings.channel_wide_mentions.option.toggled.false.button',
        channelWideMentionsOptionToggledOn: 'mention_notification_settings.channel_wide_mentions.option.toggled.true.button',
        keywordsInput: 'mention_notification_settings.keywords.input',
        keywordsInputDescription: 'mention_notification_settings.keywords.input.description',
        threadsStartParticipateOption: 'mention_notification_settings.threads_start_participate.option',
        threadsStartParticipateOptionSelected: 'mention_notification_settings.threads_start_participate.option.selected',
        threadsStartOption: 'mention_notification_settings.threads_start.option',
        threadsStartOptionSelected: 'mention_notification_settings.threads_start.option.selected',
        threadsMentionsOption: 'mention_notification_settings.threads_mentions.option',
        threadsMentionsOptionSelected: 'mention_notification_settings.threads_mentions.option.selected',
    };

    mentionNotificationSettingsScreen = element(by.id(this.testID.mentionNotificationSettingsScreen));
    backButton = element(by.id(this.testID.backButton));
    scrollView = element(by.id(this.testID.scrollView));
    caseSensitiveFirstNameOptionToggledOff = element(by.id(this.testID.caseSensitiveFirstNameOptionToggledOff));
    caseSensitiveFirstNameOptionToggledOn = element(by.id(this.testID.caseSensitiveFirstNameOptionToggledOn));
    nonCaseSensitiveUsernameOptionToggledOff = element(by.id(this.testID.nonCaseSensitiveUsernameOptionToggledOff));
    nonCaseSensitiveUsernameOptionToggledOn = element(by.id(this.testID.nonCaseSensitiveUsernameOptionToggledOn));
    channelWideMentionsOptionToggledOff = element(by.id(this.testID.channelWideMentionsOptionToggledOff));
    channelWideMentionsOptionToggledOn = element(by.id(this.testID.channelWideMentionsOptionToggledOn));
    keywordsInput = element(by.id(this.testID.keywordsInput));
    keywordsInputDescription = element(by.id(this.testID.keywordsInputDescription));
    threadsStartParticipateOption = element(by.id(this.testID.threadsStartParticipateOption));
    threadsStartParticipateOptionSelected = element(by.id(this.testID.threadsStartParticipateOptionSelected));
    threadsStartOption = element(by.id(this.testID.threadsStartOption));
    threadsStartOptionSelected = element(by.id(this.testID.threadsStartOptionSelected));
    threadsMentionsOption = element(by.id(this.testID.threadsMentionsOption));
    threadsMentionsOptionSelected = element(by.id(this.testID.threadsMentionsOptionSelected));

    toBeVisible = async () => {
        await waitFor(this.mentionNotificationSettingsScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.mentionNotificationSettingsScreen;
    };

    open = async () => {
        // # Open mention notification settings screen
        await NotificationSettingsScreen.mentionsOption.tap();

        return this.toBeVisible();
    };

    back = async () => {
        await this.backButton.tap();
        await expect(this.mentionNotificationSettingsScreen).not.toBeVisible();
    };

    getKeywordTriggerElement = async (keyword: string) => {
        return element(by.text(`${keyword.replace(/ /g, '').toLowerCase()}`));
    };

    toggleCaseSensitiveFirstNameOptionOn = async () => {
        await this.caseSensitiveFirstNameOptionToggledOff.tap();
        await expect(this.caseSensitiveFirstNameOptionToggledOn).toBeVisible();
    };

    toggleCaseSensitiveFirstNameOptionOff = async () => {
        await this.caseSensitiveFirstNameOptionToggledOn.tap();
        await expect(this.caseSensitiveFirstNameOptionToggledOff).toBeVisible();
    };

    toggleNonCaseSensitiveUsernameOptionOn = async () => {
        await this.nonCaseSensitiveUsernameOptionToggledOff.tap();
        await expect(this.nonCaseSensitiveUsernameOptionToggledOn).toBeVisible();
    };

    toggleNonCaseSensitiveUsernameOptionOff = async () => {
        await this.nonCaseSensitiveUsernameOptionToggledOn.tap();
        await expect(this.nonCaseSensitiveUsernameOptionToggledOff).toBeVisible();
    };

    toggleChannelWideMentionsOptionOn = async () => {
        await this.channelWideMentionsOptionToggledOff.tap();
        await expect(this.channelWideMentionsOptionToggledOn).toBeVisible();
    };

    toggleChannelWideMentionsOptionOff = async () => {
        await this.channelWideMentionsOptionToggledOn.tap();
        await expect(this.channelWideMentionsOptionToggledOff).toBeVisible();
    };
}

const mentionNotificationSettingsScreen = new MentionNotificationSettingsScreen();
export default mentionNotificationSettingsScreen;
