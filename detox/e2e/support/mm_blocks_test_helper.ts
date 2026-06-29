// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    Post,
    Setup,
    System,
    User,
    Webhook,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
    webhookBaseUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    ChannelScreen,
    IntegrationSelectorScreen,
    LoginScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

export class MmBlocksTestHelper {
    static readonly SERVER_DISPLAY_NAME = 'Server 1';
    static readonly CHANNELS_CATEGORY = 'channels';
    static readonly WEBHOOK_BASE_URL = webhookBaseUrl;
    static readonly ONLY_VISIBLE_TO_YOU = '(Only visible to you)';
    static readonly INTEGRATION_OK_MESSAGE = /.*Detox mm_blocks integration OK \(user: .+\).*/;
    static readonly QUERY_OK_MESSAGE = /.*Detox mm_blocks query OK.*/;
    static readonly STATIC_SELECT_OK_MESSAGE = /.*Detox mm_blocks static_select OK \(selected_option: .+\).*/;

    static async enableMmBlocks(baseUrl: string): Promise<void> {
        await User.apiAdminLogin(baseUrl);
        await System.apiUpdateConfig(baseUrl, {
            FeatureFlags: {
                MmBlocksEnabled: true,
            },
        });
    }

    static async requireWebhookSidecar(): Promise<void> {
        await Webhook.requireWebhookServer(this.WEBHOOK_BASE_URL);
    }

    static async postIncomingWebhookBlocks(
        channelId: string,
        displayName: string,
        payload: Record<string, unknown>,
    ): Promise<void> {
        await User.apiAdminLogin(siteOneUrl);
        const {hook} = await Post.apiCreateIncomingWebhook(siteOneUrl, {
            channel_id: channelId,
            display_name: displayName,
        });
        await Post.apiPostIncomingWebhook(siteOneUrl, hook.id, payload);
        await wait(timeouts.TWO_SEC);
    }

    static integrationUrl(path: string): string {
        return `${this.WEBHOOK_BASE_URL}${path}`;
    }

    static async setupChannelTest(): Promise<{channel: any; team: any; user: any}> {
        await this.enableMmBlocks(siteOneUrl);
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);

        await ServerScreen.connectToServer(serverOneUrl, this.SERVER_DISPLAY_NAME);
        await LoginScreen.login(user);
        await ChannelListScreen.toBeVisible();
        await ChannelScreen.open(this.CHANNELS_CATEGORY, channel.name);

        return {channel, team, user};
    }

    static channelPostMatcher(postId: string) {
        return by.id(`${ChannelScreen.postList.testID.postListPostItem}.${postId}`);
    }

    static channelPostContainingMatcher(postMarker: string) {
        return by.id(ChannelScreen.postList.testID.postListPostItem).withDescendant(by.text(postMarker));
    }

    static async waitForTextInChannelPost(postId: string, text: string, timeout = timeouts.TEN_SEC): Promise<void> {
        await waitFor(
            element(by.text(text).withAncestor(this.channelPostMatcher(postId))),
        ).toExist().withTimeout(timeout);
    }

    static async expectChannelPostAuthorName(authorName: string, postId: string): Promise<void> {
        const renderedAuthorName = authorName.replace(/ /g, '\xa0');
        await expect(
            element(by.id('post_header.display_name').withAncestor(this.channelPostMatcher(postId))),
        ).toHaveText(renderedAuthorName);
    }

    static async expectCollapsibleBodyVisibility(bodyLabel: string, visible: boolean): Promise<void> {
        const body = element(by.text(bodyLabel));
        if (visible) {
            await waitFor(body).toBeVisible().withTimeout(timeouts.TEN_SEC);
            return;
        }

        await wait(timeouts.HALF_SEC);
        await expect(body).not.toBeVisible();
    }

    static async tapCollapsibleHeader(headerLabel: string): Promise<void> {
        await element(by.text(headerLabel)).tap();
        await wait(400);
    }

    static async waitForPostText(text: string, timeout = timeouts.TEN_SEC): Promise<void> {
        await waitFor(element(by.text(text))).toExist().withTimeout(timeout);
    }

    static async waitForIntegrationOkMessage(timeout = timeouts.TEN_SEC): Promise<void> {
        await waitFor(element(by.text(this.INTEGRATION_OK_MESSAGE))).toExist().withTimeout(timeout);
    }

    static async waitForTextMatching(matcher: string | RegExp, timeout = timeouts.TEN_SEC): Promise<void> {
        await waitFor(element(by.text(matcher))).toExist().withTimeout(timeout);
    }

    static async waitForContextOkMessage(contextMarker: string, timeout = timeouts.TEN_SEC): Promise<void> {
        await this.waitForPostText(`Detox mm_blocks context OK (test_marker: ${contextMarker}).`, timeout);
    }

    static async waitForStaticSelectOkMessage(selectedOptionId: string, timeout = timeouts.TEN_SEC): Promise<void> {
        // Webhook response includes a trailing period; Detox regex matchers require a full TextView match.
        await this.waitForPostText(
            `Detox mm_blocks static_select OK (selected_option: ${selectedOptionId}).`,
            timeout,
        );
    }

    static async ensureOnChannelScreen(): Promise<void> {
        try {
            await waitFor(IntegrationSelectorScreen.integrationSelectorScreen).toExist().withTimeout(timeouts.ONE_SEC);
            await device.pressBack();
            await wait(timeouts.ONE_SEC);
        } catch {
            // Not on integration selector
        }

        try {
            await ThreadScreen.back();
            await wait(timeouts.ONE_SEC);
        } catch {
            // Not on thread screen
        }

        await waitFor(ChannelScreen.channelScreen).toExist().withTimeout(timeouts.TEN_SEC);
    }

    static async expectOnlyVisibleToYou(scopeToIntegrationOkPost = false): Promise<void> {
        if (scopeToIntegrationOkPost) {
            const postMatcher = by.id(ThreadScreen.postList.testID.postListPostItem).
                withDescendant(by.text(this.INTEGRATION_OK_MESSAGE));
            await expect(
                element(by.id('post_header.visible_message').withAncestor(postMatcher)),
            ).toExist();
            return;
        }

        await expect(element(by.text(this.ONLY_VISIBLE_TO_YOU)).atIndex(0)).toExist();
    }

    static async tapMmBlocksButton(actionId: string): Promise<void> {
        const button = element(by.id(`mm_blocks.button.${actionId}`));
        await waitFor(button).toExist().withTimeout(timeouts.TEN_SEC);
        await button.tap();
        await wait(timeouts.TWO_SEC);
    }

    static async tapMmBlocksStaticSelect(actionId: string): Promise<void> {
        const selectButton = element(by.id(`mm_blocks.static_select.${actionId}.select.button`));
        await waitFor(selectButton).toExist().withTimeout(timeouts.TEN_SEC);
        await selectButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
    }

    static async selectStaticOption(optionText: string): Promise<void> {
        const optionElement = element(by.text(optionText));
        await waitFor(optionElement).toExist().withTimeout(timeouts.TEN_SEC);
        await optionElement.tap();
        await wait(timeouts.TWO_SEC);
    }

    static async selectIntegrationUser(userId: string, username: string): Promise<void> {
        await IntegrationSelectorScreen.searchFor(username);
        const userItem = element(by.id(`integration_selector.user_list.user_item.${userId}.${userId}`));
        await waitFor(userItem).toExist().withTimeout(timeouts.TEN_SEC);
        await userItem.tap();
        await wait(timeouts.TWO_SEC);
    }

    static async selectIntegrationChannel(channelId: string, searchTerm: string): Promise<void> {
        await IntegrationSelectorScreen.searchFor(searchTerm);
        const channelItem = element(by.id(`integration_selector.channel_list.${channelId}`));
        await waitFor(channelItem).toExist().withTimeout(timeouts.TEN_SEC);
        await channelItem.tap();
        await wait(timeouts.TWO_SEC);
    }

    static async expectPostAuthorName(
        authorName: string,
        postMarker: string,
        location: 'channel' | 'thread' = 'thread',
    ): Promise<void> {
        const postListItemTestId = location === 'channel' ? ChannelScreen.postList.testID.postListPostItem : ThreadScreen.postList.testID.postListPostItem;
        const postMatcher = by.id(postListItemTestId).withDescendant(by.text(postMarker));

        // Post headers render display names with non-breaking spaces (see nonBreakingString).
        const renderedAuthorName = authorName.replace(/ /g, '\xa0');
        await expect(
            element(by.id('post_header.display_name').withAncestor(postMatcher)),
        ).toHaveText(renderedAuthorName);
    }

    static async openThreadForLastChannelPost(channelId: string, postMessage: string): Promise<void> {
        await this.waitForPostText(postMessage);
        const {post: rootPost} = await Post.apiGetLastPostInChannel(siteOneUrl, channelId);
        await this.openThreadForPost(rootPost.id, postMessage);
    }

    static async openThreadForPost(postId: string, postMessage: string): Promise<void> {
        await ChannelScreen.openReplyThreadFor(postId, postMessage);
        await ThreadScreen.toBeVisible();
    }

    static randomMarker(prefix: string): string {
        return `${prefix} ${getRandomId()}`;
    }
}
