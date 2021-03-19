// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {ChannelScreen, CustomStatusScreen, UserProfileScreen, ThreadScreen, ChannelInfoScreen, MoreDirectMessagesScreen} from '@support/ui/screen';
import {
    Setup,
    System,
    Post,
    Channel,
} from '@support/server_api';
import {SettingsSidebar} from '@support/ui/component';

const {openSettingsSidebar} = ChannelScreen;

describe('Custom status', () => {
    let testChannel;
    let testUser;
    beforeAll(async () => {
        await System.apiUpdateConfig({TeamSettings: {EnableCustomUserStatuses: true}});
    });

    beforeEach(async () => {
        const {team, user} = await Setup.apiInit();
        const {channel} = await Channel.apiGetChannelByName(team.name, 'town-square');
        testChannel = channel;
        testUser = user;

        // # Open channel screen
        await ChannelScreen.open(user);
    });

    afterEach(async () => {
        await ChannelScreen.logout();
    });

    const defaultCustomStatuses = ['In a meeting', 'Out for lunch', 'Out sick', 'Working from home', 'On a vacation'];

    const defaultStatus = {
        emoji: 'calendar',
        text: 'In a meeting',
    };

    const customStatus = {
        emoji: '😀',
        emojiName: 'grinning',
        text: 'Watering plants',
    };

    test('MM-T3890 Setting a custom status', async () => {
        await openSettingsSidebar();

        // # Click on the Set a custom status option and check if the modal opens
        await CustomStatusScreen.open();
        const isSuggestionPresentPromiseArray = [];
        defaultCustomStatuses.map(async (text) => {
            // * Check if all the default suggestions are visible
            isSuggestionPresentPromiseArray.push(expect(CustomStatusScreen.getCustomStatusSuggestion(text)).toBeVisible());
        });

        await Promise.all(isSuggestionPresentPromiseArray);

        // * Tap a suggestion and check if it is selected
        await CustomStatusScreen.tapSuggestion(defaultStatus);

        // * Tap again and check if it is selected again
        await CustomStatusScreen.tapSuggestion(defaultStatus);

        // # Click on Done button and check if the modal closes
        await CustomStatusScreen.close();

        await openSettingsSidebar();

        // * Check if the selected emoji and text are visible in the sidebar
        await expect(element(by.text(defaultStatus.text))).toBeVisible();
        await expect(element(by.id(`custom_status.emoji.${defaultStatus.emoji}`))).toBeVisible();

        // # Click on the Set a custom status option and check if the modal opens
        await CustomStatusScreen.open();
        await CustomStatusScreen.close();
    });

    test('MM-T3891 Setting your own custom status', async () => {
        // # Open custom status modal and close it after setting the status
        await openCustomStatusModalAndSetStatus(customStatus);
        await openSettingsSidebar();

        // * Check if the selected emoji and text are visible in the sideba
        await expect(element(by.text(customStatus.text).withAncestor(by.id(SettingsSidebar.testID.customStatusAction)))).toBeVisible();
        await expect(element(by.id(`custom_status.emoji.${customStatus.emojiName}`))).toBeVisible();

        // # Tap on the clear custom status button in the sidebar
        await SettingsSidebar.customStatusClearButton.tap();

        // * Check if the custom status is cleared and open the modal
        await expect(element(by.text('Set a Status').withAncestor(by.id(SettingsSidebar.testID.customStatusAction)))).toBeVisible();
        await CustomStatusScreen.open();

        // * Check if the previously set status is present in the Recents section
        await expect(element(by.text(customStatus.text).withAncestor(by.id('custom_status.recents')))).toBeVisible();

        // # Tap on the status in the recents section and close the modal by clicking Done button
        await element(by.text(customStatus.text).withAncestor(by.id('custom_status.recents'))).tap();
        await CustomStatusScreen.close();

        await openSettingsSidebar();

        // * Check if the status is set and open the modal
        await expect(element(by.text(customStatus.text).withAncestor(by.id(SettingsSidebar.testID.customStatusAction)))).toBeVisible();
        await expect(element(by.id(`custom_status.emoji.${customStatus.emojiName}`))).toBeVisible();
        await CustomStatusScreen.open();

        // # Tap on the input clear button in the custom status modal
        await CustomStatusScreen.clearInputButton.tap();

        // * Check if the custom status input and emoji have cleared or not and close the modal
        await expect(CustomStatusScreen.input).toHaveText('');
        await expect(CustomStatusScreen.getCustomStatusSelectedEmoji('default')).toBeVisible();
        await CustomStatusScreen.close();

        await openSettingsSidebar();

        // * Check if the custom status is cleared
        await expect(element(by.text('Set a Status').withAncestor(by.id(SettingsSidebar.testID.customStatusAction)))).toBeVisible();
        await expect(element(by.id('custom_status.emoji.default'))).toBeVisible();
        await ChannelScreen.closeSettingsSidebar();
    });

    test('MM-T3892 Recent statuses', async () => {
        // # Open custom status modal and close it after setting the status
        await openCustomStatusModalAndSetStatus(customStatus);
        await openSettingsSidebar();

        // * Check if the status is set in the sidebar
        await expect(element(by.text(customStatus.text).withAncestor(by.id(SettingsSidebar.testID.customStatusAction)))).toBeVisible();
        await expect(element(by.id(`custom_status.emoji.${customStatus.emojiName}`))).toBeVisible();

        // # Tap on the clear custom status button in the sidebar
        await SettingsSidebar.customStatusClearButton.tap();

        // * Check if the custom status is cleared and open the modal
        await expect(element(by.text('Set a Status').withAncestor(by.id(SettingsSidebar.testID.customStatusAction)))).toBeVisible();
        await CustomStatusScreen.open();

        // * Check if the previously set status is present in the Recents section
        await expect(element(by.text(customStatus.text).withAncestor(by.id('custom_status.recents')))).toBeVisible();

        // # Tap on the clear button corresponding to the suggestion containing the previously set status
        await CustomStatusScreen.getSuggestionClearButton(customStatus.text).tap();

        // * Check if the suggestion is removed or not
        await expect(CustomStatusScreen.getCustomStatusSuggestion(customStatus.text)).not.toExist();

        // # Choose a status from the suggestions and set the status
        await CustomStatusScreen.tapSuggestion(defaultStatus);
        await CustomStatusScreen.close();

        await openSettingsSidebar();

        // * Check if the status is set in the sidebar
        await expect(element(by.text(defaultStatus.text))).toBeVisible();
        await expect(element(by.id(`custom_status.emoji.${defaultStatus.emoji}`))).toBeVisible();

        // # Tap on the clear custom status button in the sidebar
        await SettingsSidebar.customStatusClearButton.tap();

        // * Check if the custom status is cleared and open the modal
        await expect(element(by.text('Set a Status').withAncestor(by.id(SettingsSidebar.testID.customStatusAction)))).toBeVisible();
        await CustomStatusScreen.open();

        // * The last set status should be present in Recents list and not in the Suggestions list
        await expect(element(by.text(defaultStatus.text).withAncestor(by.id('custom_status.recents')))).toBeVisible();
        await expect(element(by.text(defaultStatus.text).withAncestor(by.id('custom_status.suggestions')))).not.toExist();

        // # Tap on the clear button of the suggestion containing the last set status
        await CustomStatusScreen.getSuggestionClearButton(defaultStatus.text).tap();

        // * The status should be moved from the Recents list to the Suggestions list
        await expect(element(by.text(defaultStatus.text).withAncestor(by.id('custom_status.recents')))).not.toExist();
        await expect(element(by.text(defaultStatus.text).withAncestor(by.id('custom_status.suggestions')))).toBeVisible();

        // # Close the modal
        await CustomStatusScreen.close();
    });

    test('MM-T3893 Verifying where the custom status appears', async () => {
        const message = 'Hello';

        // # Open custom status modal and close it after setting the status
        await openCustomStatusModalAndSetStatus(customStatus);
        await openSettingsSidebar();

        // * Check if the status is set in the sidebar and close the sidebar
        await expect(element(by.text(customStatus.text).withAncestor(by.id(SettingsSidebar.testID.customStatusAction)))).toBeVisible();
        await expect(element(by.id(`custom_status.emoji.${customStatus.emojiName}`))).toBeVisible();
        await ChannelScreen.closeSettingsSidebar();

        // # Post a message and check if custom status emoji is present in the post header
        await ChannelScreen.postMessage(message);
        await expect(element(by.id(`custom_status_emoji.${customStatus.emojiName}`).withAncestor(by.id('post_header')))).toBeVisible();

        // # Open the reply thread for the last post
        const {post} = await Post.apiGetLastPostInChannel(testChannel.id);
        await ChannelScreen.openReplyThreadFor(post.id, message);

        // * Check if the custom status emoji is present in the post header and close thread
        await expect(element(by.id(`custom_status_emoji.${customStatus.emojiName}`).withAncestor(by.id('post_header')))).toBeVisible();
        await ThreadScreen.back();

        await openSettingsSidebar();

        // # Open user profile screen
        await UserProfileScreen.open();
        await UserProfileScreen.toBeVisible();

        // * Check if custom status is present in the user profile screen and close it
        await expect(element(by.id(`custom_status.emoji.${customStatus.emojiName}`))).toBeVisible();
        await expect(element(by.text(customStatus.text).withAncestor(by.id(UserProfileScreen.testID.customStatus)))).toBeVisible();
        await UserProfileScreen.close();

        // # Open the main sidebar and click on more direct messages button
        await ChannelScreen.openMainSidebar();
        await MoreDirectMessagesScreen.open();

        // # Type the logged in user's username and tap it to open the DM
        await MoreDirectMessagesScreen.searchInput.typeText(testUser.username);
        await MoreDirectMessagesScreen.getUserAtIndex(0).tap();

        // * Check if the custom status emoji is present in the channel title
        await expect(element(by.id(`custom_status_emoji.${customStatus.emojiName}`).withAncestor(by.id('channel.title.button')))).toBeVisible();

        // # Open the channel info screen
        await ChannelInfoScreen.open();

        // * Check if the custom status is present in the channel info screen and then close the screen
        await expect(element(by.id(`custom_status.emoji.${customStatus.emojiName}`))).toBeVisible();
        await expect(element(by.text(customStatus.text).withAncestor(by.id(ChannelInfoScreen.testID.headerCustomStatus)))).toBeVisible();
        await ChannelInfoScreen.close();

        // # Open main sidebar and check if custom status emoji is present next to the username in the Direct messages section
        await ChannelScreen.openMainSidebar();
        expect(element(by.id(`${testUser.username}.custom_status_emoji.${customStatus.emojiName}`))).toBeVisible();
        await ChannelScreen.closeMainSidebar();
    });
});

async function openCustomStatusModalAndSetStatus(customStatus) {
    await openSettingsSidebar();

    // # Click on the Set a custom status option and check if the modal opens
    await CustomStatusScreen.open();

    // # Type the custom status text in the custom status input
    await CustomStatusScreen.input.typeText(customStatus.text);

    // * Check if the speech balloon emoji appears when some text is typed in the input
    await expect(CustomStatusScreen.getCustomStatusSelectedEmoji('speech_balloon')).toBeVisible();

    // # First tap to dismiss the keyboard and then tap again to open the emoji picker
    await CustomStatusScreen.getCustomStatusSelectedEmoji('speech_balloon').multiTap(2);

    // * Check if the Add reaction screen appears
    await expect(element(by.id('add_reaction.screen'))).toBeVisible();

    // * Check if the emoji to be selected is present in the emojipicker and select it
    await expect(element(by.text(customStatus.emoji))).toBeVisible();
    await element(by.text(customStatus.emoji)).tap();

    // * Check if the Add reaction screen disappears
    await expect(element(by.id('add_reaction.screen'))).not.toBeVisible();

    // * Check if the selected emoji is visible and close the modal by clicking on Done button
    await expect(CustomStatusScreen.getCustomStatusSelectedEmoji(customStatus.emojiName)).toBeVisible();
    await CustomStatusScreen.close();
}
