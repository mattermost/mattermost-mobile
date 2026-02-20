// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// Auto-translation E2E tests. Requires:
// - LibreTranslate mock running: node detox/mock_libre_translate.js
// - Server with EnableAutoTranslation and translation plugin pointing at the mock
// *******************************************************************

/* eslint-disable max-lines */

import {setMockSourceLanguage} from '@support/libre_translate_mock';
import {
    Channel,
    Post,
    Setup,
    Team,
    User,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelInfoScreen,
    ChannelListScreen,
    ChannelScreen,
    ChannelSettingsScreen,
    EditPostScreen,
    HomeScreen,
    LoginScreen,
    PostOptionsScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

const SHOW_TRANSLATION_SCREEN_ID = 'show_translation.screen';
const CHANNEL_HEADER_AUTOTRANSLATION_ICON_ID = 'channel_header.autotranslation.icon';

type TestChannel = { id: string; name: string; display_name?: string };
type TestTeam = { id: string };
type TestUser = { id: string; username?: string };

async function isElementVisible(el: Detox.NativeElement, timeoutMs = 2000): Promise<boolean> {
    try {
        await waitFor(el).toBeVisible().withTimeout(timeoutMs);
        return true;
    } catch {
        return false;
    }
}

describe('Auto-Translation', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: TestChannel;
    let testTeam: TestTeam;
    let testUser: TestUser;

    beforeAll(async () => {
        const {team, user} = await Setup.apiInit(siteOneUrl);
        testTeam = team;
        testUser = user;

        await User.apiPatchUser(siteOneUrl, testUser.id, {locale: 'en'});
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            name: `at-${getRandomId()}`,
            displayName: `AT ${getRandomId()}`,
            type: 'O',
        });
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);
        await Channel.apiUpdateChannelMemberRoles(siteOneUrl, channel.id, testUser.id, 'channel_user channel_admin');
        testChannel = channel;
        await wait(timeouts.ONE_SEC);
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        await HomeScreen.logout();
    });

    const scrollToChannelAutotranslation = async () => {
        await waitFor(ChannelSettingsScreen.channelAutotranslationOptionToggledOff).
            toBeVisible().
            withTimeout(timeouts.TEN_SEC).
            catch(() => null);
        const visible = await isElementVisible(ChannelSettingsScreen.channelAutotranslationOptionToggledOff);
        if (!visible) {
            await ChannelSettingsScreen.scrollView.scroll(150, 'down');
            await wait(timeouts.ONE_SEC);
        }
    };

    const scrollToChannelAutotranslationToggledOn = async () => {
        await waitFor(ChannelSettingsScreen.channelAutotranslationOptionToggledOn).
            toBeVisible().
            withTimeout(timeouts.TEN_SEC).
            catch(() => null);
        const visible = await isElementVisible(ChannelSettingsScreen.channelAutotranslationOptionToggledOn);
        if (!visible) {
            await ChannelSettingsScreen.scrollView.scroll(150, 'down');
            await wait(timeouts.ONE_SEC);
        }
    };

    const enableChannelAutotranslation = async () => {
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();
        await scrollToChannelAutotranslation();
        await waitFor(ChannelSettingsScreen.channelAutotranslationToggleOffButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ChannelSettingsScreen.channelAutotranslationToggleOffButton.tap();
        await wait(timeouts.TWO_SEC);
        await ChannelSettingsScreen.close();
        await ChannelInfoScreen.close();
        await wait(timeouts.ONE_SEC);
    };

    const ensureUserOptedIn = async () => {
        await ChannelInfoScreen.open();
        const myOffVisible = await isElementVisible(ChannelInfoScreen.myAutotranslationOptionToggledOff, 5000);
        if (myOffVisible) {
            await ChannelInfoScreen.myAutotranslationToggleOffButton.tap();
            await wait(timeouts.TWO_SEC);
        }
        await ChannelInfoScreen.close();
        await wait(timeouts.ONE_SEC);
    };

    const ensureUserOptedOut = async () => {
        await ChannelInfoScreen.open();
        const myOnVisible = await isElementVisible(ChannelInfoScreen.myAutotranslationOptionToggledOn, 5000);
        if (myOnVisible) {
            await ChannelInfoScreen.myAutotranslationToggleOnButton.tap();
            await wait(timeouts.TWO_SEC);
            await element(by.text('Yes, turn off')).tap();
            await wait(timeouts.TWO_SEC);
        }
        await ChannelInfoScreen.close();
        await wait(timeouts.ONE_SEC);
    };

    describe('B. Permissions', () => {
        it('AT-PERM-06 - User without permission cannot enable for a channel', async () => {
            const {user: memberUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'member'});
            await Team.apiAddUserToTeam(siteOneUrl, memberUser.id, testTeam.id);
            const {channel: memberChannel} = await Channel.apiCreateChannel(siteOneUrl, {
                teamId: testTeam.id,
                name: `perm-test-${getRandomId()}`,
                displayName: `Perm Test ${getRandomId()}`,
                type: 'O',
            });
            await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, memberChannel.id);
            await Channel.apiAddUserToChannel(siteOneUrl, memberUser.id, memberChannel.id);
            await wait(timeouts.TWO_SEC);

            await HomeScreen.logout();
            await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
            await LoginScreen.login(memberUser);

            await ChannelScreen.open(channelsCategory, memberChannel.name);
            await ChannelInfoScreen.open();
            await ChannelInfoScreen.openChannelSettings();
            await ChannelSettingsScreen.toBeVisible();
            await ChannelSettingsScreen.scrollView.scroll(200, 'down');
            await wait(timeouts.ONE_SEC);
            await expect(ChannelSettingsScreen.channelSettingsScreen).toBeVisible();
            await expect(ChannelSettingsScreen.channelAutotranslationOptionToggledOff).not.toExist();
            await expect(ChannelSettingsScreen.channelAutotranslationOptionToggledOn).not.toExist();
            await ChannelSettingsScreen.close();
            await ChannelInfoScreen.close();
            await ChannelScreen.back();

            await HomeScreen.logout();
            await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
            await LoginScreen.login(testUser);
        });
    });

    describe('C. Channel-level enable/disable', () => {
        it('AT-CH-01 - Channel admin can enable auto-translation in Channel Settings', async () => {
            await ChannelScreen.open(channelsCategory, testChannel.name);
            await ChannelInfoScreen.open();
            await ChannelInfoScreen.openChannelSettings();
            await ChannelSettingsScreen.toBeVisible();

            await scrollToChannelAutotranslation();
            await waitFor(ChannelSettingsScreen.channelAutotranslationToggleOffButton).
                toBeVisible().
                withTimeout(timeouts.TEN_SEC);
            await ChannelSettingsScreen.channelAutotranslationToggleOffButton.tap();
            await wait(timeouts.TWO_SEC);

            await scrollToChannelAutotranslationToggledOn();
            await expect(ChannelSettingsScreen.channelAutotranslationOptionToggledOn).toBeVisible();

            await ChannelSettingsScreen.close();
            await ChannelInfoScreen.close();
            await ChannelScreen.back();
        });

        it('AT-CH-02 - Enabling posts a system message in the channel', async () => {
            await ChannelScreen.open(channelsCategory, testChannel.name);
            await ChannelInfoScreen.open();
            await ChannelInfoScreen.openChannelSettings();
            await ChannelSettingsScreen.toBeVisible();
            await scrollToChannelAutotranslation();
            await waitFor(ChannelSettingsScreen.channelAutotranslationToggleOffButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await ChannelSettingsScreen.channelAutotranslationToggleOffButton.tap();
            await wait(timeouts.TWO_SEC);
            await ChannelSettingsScreen.close();
            await ChannelInfoScreen.close();

            await wait(timeouts.TWO_SEC);
            const {post: systemPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
            const expectedSubstrings = ['enabled Auto-translation for this channel', 'All new messages will appear in your preferred language'];
            if (!systemPost?.message || !expectedSubstrings.every((s) => systemPost.message.includes(s))) {
                throw new Error(`Expected system message like "@user enabled Auto-translation for this channel. All new messages will appear in your preferred language.", got: ${systemPost?.message ?? 'no post'}`);
            }
            const {postListPostItem} = ChannelScreen.getPostListPostItem(systemPost.id);
            await expect(postListPostItem).toBeVisible();
            await ChannelScreen.back();
        });

        it('AT-CH-03 - Applies only to new messages', async () => {
            const messageBefore = `Before enable ${getRandomId()}`;
            await ChannelScreen.open(channelsCategory, testChannel.name);
            await ChannelScreen.postMessage(messageBefore);
            await wait(timeouts.ONE_SEC);

            const {post: postBefore} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

            await ChannelInfoScreen.open();
            await ChannelInfoScreen.openChannelSettings();
            await ChannelSettingsScreen.toBeVisible();
            await scrollToChannelAutotranslation();
            await waitFor(ChannelSettingsScreen.channelAutotranslationOptionToggledOff).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await ChannelSettingsScreen.channelAutotranslationToggleOffButton.tap();
            await wait(timeouts.TWO_SEC);
            await ChannelSettingsScreen.close();
            await ChannelInfoScreen.close();

            await setMockSourceLanguage(undefined, 'es');
            const messageAfter = `After enable ${getRandomId()}`;
            await ChannelScreen.postMessage(messageAfter);
            await wait(timeouts.FOUR_SEC);

            const translatedBeforeText = `[en] ${messageBefore}`;
            const translatedAfterText = `[en] ${messageAfter}`;

            const {post: postAfter} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
            const {postListPostItem: itemAfter} = ChannelScreen.getPostListPostItem(postAfter.id, translatedAfterText);
            await expect(itemAfter).toBeVisible();
            const {postListPostItem: itemBefore} = ChannelScreen.getPostListPostItem(postBefore.id, translatedBeforeText);
            await expect(itemBefore).not.toBeVisible();
            await ChannelScreen.back();
        });

        it('AT-CH-04 - Channel header shows auto-translated icon when enabled and user opted in', async () => {
            await ChannelScreen.open(channelsCategory, testChannel.name);
            await ChannelInfoScreen.open();
            await ChannelInfoScreen.openChannelSettings();
            await ChannelSettingsScreen.toBeVisible();
            await scrollToChannelAutotranslation();
            await waitFor(ChannelSettingsScreen.channelAutotranslationToggleOffButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await ChannelSettingsScreen.channelAutotranslationToggleOffButton.tap();
            await wait(timeouts.TWO_SEC);
            await ChannelSettingsScreen.close();
            await ChannelInfoScreen.close();

            await wait(timeouts.ONE_SEC);
            await expect(element(by.id(CHANNEL_HEADER_AUTOTRANSLATION_ICON_ID))).toBeVisible();
            await ChannelScreen.back();
        });
    });

    describe('E. Per-user opt-out / opt-in', () => {
        it('AT-USER-01 - Auto-translation starts ON for all members when channel admin enables', async () => {
            await ChannelScreen.open(channelsCategory, testChannel.name);
            await ChannelInfoScreen.open();
            await ChannelInfoScreen.openChannelSettings();
            await ChannelSettingsScreen.toBeVisible();
            await scrollToChannelAutotranslation();
            await waitFor(ChannelSettingsScreen.channelAutotranslationOptionToggledOff).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await ChannelSettingsScreen.channelAutotranslationToggleOffButton.tap();
            await wait(timeouts.TWO_SEC);
            await ChannelSettingsScreen.close();
            await ChannelInfoScreen.close();

            await wait(timeouts.ONE_SEC);
            await ChannelInfoScreen.open();
            await waitFor(ChannelInfoScreen.myAutotranslationOptionToggledOn).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await expect(ChannelInfoScreen.myAutotranslationOptionToggledOn).toBeVisible();
            await ChannelInfoScreen.close();
            await ChannelScreen.back();
        });

        it('AT-USER-02 - User can toggle auto-translation OFF from channel menu', async () => {
            await enableChannelAutotranslation();
            await ensureUserOptedIn();
            await ChannelInfoScreen.open();
            await waitFor(ChannelInfoScreen.myAutotranslationToggleOnButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await ChannelInfoScreen.myAutotranslationToggleOnButton.tap();
            await wait(timeouts.ONE_SEC);
            await element(by.text('Yes, turn off')).tap();
            await wait(timeouts.TWO_SEC);
            await expect(ChannelInfoScreen.myAutotranslationOptionToggledOff).toBeVisible();
            await ChannelInfoScreen.close();
            await ChannelScreen.back();
        });

        it('AT-USER-04 - Opting out removes header icon for that user', async () => {
            await enableChannelAutotranslation();
            await ensureUserOptedIn();
            await ensureUserOptedOut();
            await expect(element(by.id(CHANNEL_HEADER_AUTOTRANSLATION_ICON_ID))).not.toBeVisible();
            await ChannelScreen.back();
        });

        it('AT-USER-05 - Opting back in restores header icon', async () => {
            await enableChannelAutotranslation();
            await ensureUserOptedOut();
            await ChannelInfoScreen.open();
            await waitFor(ChannelInfoScreen.myAutotranslationToggleOffButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await ChannelInfoScreen.myAutotranslationToggleOffButton.tap();
            await wait(timeouts.TWO_SEC);
            await ChannelInfoScreen.close();
            await wait(timeouts.ONE_SEC);
            await expect(element(by.id(CHANNEL_HEADER_AUTOTRANSLATION_ICON_ID))).toBeVisible();
            await ChannelScreen.back();
        });

        it('AT-USER-06 - Disabling for self reverts translated messages to original', async () => {
            await enableChannelAutotranslation();
            await ensureUserOptedIn();
            await ChannelInfoScreen.open();
            await waitFor(ChannelInfoScreen.myAutotranslationToggleOnButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await ChannelInfoScreen.myAutotranslationToggleOnButton.tap();
            await wait(timeouts.ONE_SEC);
            await element(by.text('Yes, turn off')).tap();
            await wait(timeouts.THREE_SEC);
            await ChannelInfoScreen.close();
            await expect(element(by.id(CHANNEL_HEADER_AUTOTRANSLATION_ICON_ID))).not.toExist();
            await ChannelScreen.back();
        });

        it('AT-USER-07 - Confirmation prompt when disabling', async () => {
            await enableChannelAutotranslation();
            await ensureUserOptedIn();
            await ChannelInfoScreen.open();
            await waitFor(ChannelInfoScreen.myAutotranslationToggleOnButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await ChannelInfoScreen.myAutotranslationToggleOnButton.tap();
            await wait(timeouts.ONE_SEC);
            await expect(element(by.text('Turn off auto-translation'))).toBeVisible();
            await element(by.text('cancel')).tap();
            await wait(timeouts.ONE_SEC);
            await ChannelInfoScreen.close();
            await ChannelScreen.back();
        });
    });

    describe('H. Message-level and Show Translation', () => {
        it('AT-MSG-01 - Translated messages show indicator; tapping opens Show Translation', async () => {
            await setMockSourceLanguage(undefined, 'es');
            await enableChannelAutotranslation();
            const message = `Indicator test ${getRandomId()}`;
            await ChannelScreen.postMessage(message);
            await wait(timeouts.FOUR_SEC);
            const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
            await ChannelScreen.openPostOptionsFor(post.id, `[en] ${message}`);
            await waitFor(PostOptionsScreen.showTranslationOption).toBeVisible().withTimeout(timeouts.THREE_SEC);
            await PostOptionsScreen.showTranslationOption.tap();
            await wait(timeouts.TWO_SEC);
            await expect(element(by.id(SHOW_TRANSLATION_SCREEN_ID))).toBeVisible();
            await device.pressBack();
            await ChannelScreen.back();
        });
    });

    describe('F. Language support', () => {
        it('AT-LANG-01 - If user language not in target list, toggle is disabled', async () => {
            await enableChannelAutotranslation();
            await User.apiPatchUser(siteOneUrl, testUser.id, {locale: 'zh-CN'});
            await wait(timeouts.TWO_SEC);
            await ChannelInfoScreen.open();
            await waitFor(ChannelInfoScreen.myAutotranslationOption).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await expect(ChannelInfoScreen.myAutotranslationOption).toBeVisible();
            await expect(element(by.text('Your language is not supported'))).toBeVisible();
            await ChannelInfoScreen.close();
            await ChannelScreen.back();
            await User.apiPatchUser(siteOneUrl, testUser.id, {locale: 'en'});
            await wait(timeouts.ONE_SEC);
        });

        it('AT-LANG-03 - Only translate when source differs from user language', async () => {
            await User.apiPatchUser(siteOneUrl, testUser.id, {locale: 'en'});
            await enableChannelAutotranslation();
            await wait(timeouts.ONE_SEC);
            await setMockSourceLanguage(undefined, 'es');
            const spanishMessage = `Spanish text ${getRandomId()}`;
            await ChannelScreen.postMessage(spanishMessage);
            await wait(timeouts.FOUR_SEC);
            const {post: spanishPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
            await expect(ChannelScreen.getPostListPostItem(spanishPost.id, `[en] ${spanishMessage}`).postListPostItem).toBeVisible();
            await setMockSourceLanguage(undefined, 'en');
            const englishMessage = `English text ${getRandomId()}`;
            await ChannelScreen.postMessage(englishMessage);
            await wait(timeouts.FOUR_SEC);
            const {post: englishPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
            await expect(ChannelScreen.getPostListPostItem(englishPost.id, englishMessage).postListPostItem).toBeVisible();
            await ChannelScreen.back();
        });
    });

    describe('G. Changing preferred language', () => {
        it('AT-PREF-01 - New messages translate into updated preferred language', async () => {
            await enableChannelAutotranslation();
            await ensureUserOptedIn();
            await User.apiPatchUser(siteOneUrl, testUser.id, {locale: 'fr'});
            await wait(timeouts.TWO_SEC);
            await setMockSourceLanguage(undefined, 'es');
            const message = `For French ${getRandomId()}`;
            await ChannelScreen.postMessage(message);
            await wait(timeouts.FOUR_SEC);
            const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
            const translatedMessage = `[fr] ${message}`;
            const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, translatedMessage);
            await expect(postListPostItem).toBeVisible();
            await ChannelScreen.back();
            await User.apiPatchUser(siteOneUrl, testUser.id, {locale: 'en'});
            await wait(timeouts.ONE_SEC);
        });

        it('AT-PREF-04 - New preferred language not in target list', async () => {
            await enableChannelAutotranslation();
            await User.apiPatchUser(siteOneUrl, testUser.id, {locale: 'zh-CN'});
            await wait(timeouts.TWO_SEC);
            await ChannelInfoScreen.open();
            await expect(ChannelInfoScreen.myAutotranslationOption).toBeVisible();
            await expect(element(by.id(CHANNEL_HEADER_AUTOTRANSLATION_ICON_ID))).not.toBeVisible();
            await ChannelInfoScreen.close();
            const message = `No translation prefix ${getRandomId()}`;
            await ChannelScreen.postMessage(message);
            await wait(timeouts.FOUR_SEC);
            const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
            const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
            await expect(postListPostItem).toBeVisible();
            await ChannelScreen.back();
            await User.apiPatchUser(siteOneUrl, testUser.id, {locale: 'en'});
            await wait(timeouts.ONE_SEC);
        });
    });

    describe('J. Editing', () => {
        it('AT-EDIT-01 - Edit translated message re-translates', async () => {
            await setMockSourceLanguage(undefined, 'es');
            await enableChannelAutotranslation();
            const message = `Edit me ${getRandomId()}`;
            await ChannelScreen.postMessage(message);
            await wait(timeouts.FOUR_SEC);
            const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
            const translatedInitial = `[en] ${message}`;
            const {postListPostItem: initialPostItem} = ChannelScreen.getPostListPostItem(post.id, translatedInitial);
            await expect(initialPostItem).toBeVisible();
            await ChannelScreen.openPostOptionsFor(post.id, translatedInitial);
            await PostOptionsScreen.editPostOption.tap();
            await EditPostScreen.toBeVisible();
            const editedMessage = `${message} edited`;
            await EditPostScreen.messageInput.replaceText(editedMessage);
            await EditPostScreen.saveButton.tap();
            await wait(timeouts.FOUR_SEC);
            const translatedEdited = `[en] ${editedMessage}`;
            const {postListPostItem: editedPostItem} = ChannelScreen.getPostListPostItem(post.id);
            await expect(editedPostItem).toBeVisible();
            await ChannelScreen.assertPostMessageEdited(post.id, translatedEdited);
            await ChannelScreen.back();
        });
    });

    describe('K. Threads', () => {
        it('AT-THR-01 - Thread view shows translated content', async () => {
            await setMockSourceLanguage(undefined, 'es');
            await enableChannelAutotranslation();
            await ensureUserOptedIn();
            const parentMessage = `Thread parent ${getRandomId()}`;
            await ChannelScreen.postMessage(parentMessage);
            await wait(timeouts.FOUR_SEC);
            const {post: parentPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
            const translatedParent = `[en] ${parentMessage}`;
            await ChannelScreen.openReplyThreadFor(parentPost.id, translatedParent);
            await wait(timeouts.ONE_SEC);
            await expect(ThreadScreen.threadScreen).toBeVisible();
            const {postListPostItem: parentPostItem} = ThreadScreen.getPostListPostItem(parentPost.id, translatedParent);
            await expect(parentPostItem).toBeVisible();
            const replyMessage = `Thread reply ${getRandomId()}`;
            await ThreadScreen.postMessage(replyMessage);
            await wait(timeouts.FOUR_SEC);
            const {post: replyPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
            const translatedReply = `[en] ${replyMessage}`;
            const {postListPostItem: replyPostItem} = ThreadScreen.getPostListPostItem(replyPost.id, translatedReply);
            await expect(replyPostItem).toBeVisible();
            await ThreadScreen.back();
            await ChannelScreen.back();
        });
    });

    describe('L. Permalink', () => {
        it('AT-PL-01 - Permalink preview shows translated message', async () => {
            await enableChannelAutotranslation();
            await setMockSourceLanguage(undefined, 'es');
            const message = `Permalink source ${getRandomId()}`;
            await ChannelScreen.postMessage(message);
            await wait(timeouts.FOUR_SEC);
            const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
            const translatedMessage = `[en] ${message}`;
            await ChannelScreen.openPostOptionsFor(post.id, translatedMessage);
            await PostOptionsScreen.copyLinkOption.tap();
            await wait(timeouts.TWO_SEC);
            const {channel: otherChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id, prefix: 'at-pl'});
            await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, otherChannel.id);
            await wait(timeouts.TWO_SEC);
            await ChannelScreen.back();
            await ChannelScreen.open(channelsCategory, otherChannel.name);
            const permalinkUrl = `${serverOneUrl}/${(testTeam as {id: string; name: string}).name}/pl/${post.id}`;
            await ChannelScreen.postMessage(`See ${permalinkUrl}`);
            await wait(timeouts.FOUR_SEC);
            await expect(
                element(by.text(translatedMessage).withAncestor(by.id('permalink-preview-container'))),
            ).toBeVisible();
            await expect(
                element(by.text(`Originally posted in ~${testChannel.display_name || testChannel.name}`).withAncestor(by.id('permalink-preview-container'))),
            ).toBeVisible();
            await ChannelScreen.back();
        });
    });
});
