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
    PostOptionsScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {
    getRandomId,
    longPressWithScrollRetry,
    scrollElementIntoView,
    timeouts,
    wait,
} from '@support/utils';
import {expect, waitFor} from 'detox';

export class MmBlocksTestHelper {
    static readonly SERVER_DISPLAY_NAME = 'Server 1';
    static readonly CHANNELS_CATEGORY = 'channels';
    static readonly WEBHOOK_BASE_URL = webhookBaseUrl;
    static readonly ONLY_VISIBLE_TO_YOU = '(Only visible to you)';
    static readonly INTEGRATION_OK_MESSAGE = /.*Detox mm_blocks integration OK \(user: .+\).*/;
    static readonly QUERY_OK_MESSAGE = /.*Detox mm_blocks query OK.*/;
    static readonly STATIC_SELECT_OK_MESSAGE = /.*Detox mm_blocks static_select OK \(selected_option: .+\).*/;

    // Once set, remaining specs in this process abort immediately (CI 59ec6ae burned
    // ~23×300s after sidecar health passed but thread-open / callbacks stalled).
    private static suiteBlockedReason: string | undefined;

    // Last channel opened by setupChannelTest — used when launchApp recovery lands on the list.
    private static lastChannelName: string | undefined;

    static async assertMmBlocksEnabled(baseUrl: string): Promise<void> {
        const enabled = await System.waitForClientConfigFlag(
            baseUrl,
            'FeatureFlagMmBlocksEnabled',
            'true',
        );
        if (!enabled) {
            const {config} = await System.apiGetClientConfigOld(baseUrl);
            throw new Error(
                `[mm_blocks] FeatureFlagMmBlocksEnabled is "${config?.FeatureFlagMmBlocksEnabled ?? 'missing'}". ` +
                'Cloud Spinwick installations must set MM_FEATUREFLAGS_MMBLOCKSENABLED=true in Matterwick PriorityEnv',
            );
        }
    }

    static async requireWebhookSidecar(): Promise<void> {
        this.suiteBlockedReason = undefined;
        await Webhook.requireWebhookServer(this.WEBHOOK_BASE_URL);
    }

    static assertSuiteRunnable(): void {
        if (this.suiteBlockedReason) {
            throw new Error(
                `[mm_blocks] Suite aborted after earlier failure: ${this.suiteBlockedReason}. ` +
                'Configure MM_MOBILE_E2E_WEBHOOK_PUBLIC_BASE_URL for stable Mattermost→sidecar callbacks.',
            );
        }
    }

    private static blockSuite(reason: string): void {
        this.suiteBlockedReason = reason;
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
        await this.assertMmBlocksEnabled(siteOneUrl);
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);

        await ServerScreen.connectToServer(serverOneUrl, this.SERVER_DISPLAY_NAME);
        await LoginScreen.login(user);
        await ChannelListScreen.toBeVisible();

        // Reload after login so the client picks up FeatureFlagMmBlocksEnabled;
        // reload always lands on the channel list, then re-open.
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
        this.lastChannelName = channel.name;
        await ChannelScreen.open(this.CHANNELS_CATEGORY, channel.name);

        return {channel, team, user};
    }

    static channelPostMatcher(postId: string) {
        return by.id(`${ChannelScreen.postList.testID.postListPostItem}.${postId}`);
    }

    static channelPostContainingMatcher(postMarker: string) {
        return by.id(ChannelScreen.postList.testID.postListPostItem).withDescendant(by.text(postMarker));
    }

    private static async activeScrollContainer(): Promise<Detox.NativeMatcher> {
        const threadList = by.id(ThreadScreen.postList.testID.flatList);
        try {
            await waitFor(element(threadList)).toExist().withTimeout(timeouts.ONE_SEC);
            return threadList;
        } catch {
            return by.id(ChannelScreen.postList.testID.flatList);
        }
    }

    private static async bringIntoView(target: Detox.NativeElement): Promise<void> {
        try {
            await scrollElementIntoView(target, await this.activeScrollContainer());
        } catch {
            // Already on screen, or list is not scrollable further.
        }
    }

    private static async dismissPostOptionsIfOpen(): Promise<void> {
        try {
            await waitFor(PostOptionsScreen.postOptionsScreen).toExist().withTimeout(timeouts.ONE_SEC);
            try {
                await device.pressBack();
            } catch {
                // iOS may not support pressBack; ignore.
            }
            await waitFor(PostOptionsScreen.postOptionsScreen).not.toExist().withTimeout(timeouts.THREE_SEC);
        } catch {
            // Options sheet not open.
        }
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
            await this.bringIntoView(body);
            await waitFor(body).toBeVisible().withTimeout(timeouts.TEN_SEC);
            return;
        }

        // Do not scroll here — an off-screen body would falsely pass not.toBeVisible.
        await wait(timeouts.HALF_SEC);
        await expect(body).not.toBeVisible();
    }

    static async tapCollapsibleHeader(headerLabel: string): Promise<void> {
        const header = element(by.text(headerLabel));
        await this.bringIntoView(header);
        await waitFor(header).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await header.tap();
        await wait(400);
    }

    static async waitForPostText(text: string, timeout = timeouts.TEN_SEC): Promise<void> {
        await waitFor(element(by.text(text))).toExist().withTimeout(timeout);
    }

    static async waitForIntegrationOkMessage(timeout = timeouts.TWENTY_SEC): Promise<void> {
        try {
            await waitFor(element(by.text(this.INTEGRATION_OK_MESSAGE))).toExist().withTimeout(timeout);
        } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            this.blockSuite(`integration OK message not received within ${timeout}ms (${detail})`);
            throw error;
        }
    }

    static async waitForTextMatching(matcher: string | RegExp, timeout = timeouts.TEN_SEC): Promise<void> {
        await waitFor(element(by.text(matcher))).toExist().withTimeout(timeout);
    }

    static async waitForContextOkMessage(contextMarker: string, timeout = timeouts.TWENTY_SEC): Promise<void> {
        try {
            await this.waitForPostText(`Detox mm_blocks context OK (test_marker: ${contextMarker}).`, timeout);
        } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            this.blockSuite(`context OK message not received for ${contextMarker} (${detail})`);
            throw error;
        }
    }

    static async waitForStaticSelectOkMessage(selectedOptionId: string, timeout = timeouts.TWENTY_SEC): Promise<void> {
        // Webhook response includes a trailing period; Detox regex matchers require a full TextView match.
        try {
            await this.waitForPostText(
                `Detox mm_blocks static_select OK (selected_option: ${selectedOptionId}).`,
                timeout,
            );
        } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            this.blockSuite(`static_select OK message not received for ${selectedOptionId} (${detail})`);
            throw error;
        }
    }

    static async ensureOnChannelScreen(): Promise<void> {
        try {
            await waitFor(IntegrationSelectorScreen.integrationSelectorScreen).toExist().withTimeout(timeouts.ONE_SEC);
            await device.pressBack();
            await wait(timeouts.ONE_SEC);
        } catch {
            // Not on integration selector
        }

        await this.dismissPostOptionsIfOpen();

        try {
            await ThreadScreen.back();
            await wait(timeouts.ONE_SEC);
        } catch {
            // Not on thread screen
        }

        try {
            await waitFor(ChannelScreen.channelScreen).toExist().withTimeout(timeouts.TEN_SEC);
        } catch {
            // Recover from a stuck Detox sync / wrong screen (CI 59ec6ae).
            await device.launchApp({newInstance: false});
            try {
                await waitFor(ChannelScreen.channelScreen).toExist().withTimeout(timeouts.TEN_SEC);
            } catch {
                // Relaunch often restores the channel list, not channel.screen
                // (CI 30340678924 mm_blocks_ephemeral afterAllFailure.png iOS+Android).
                await ChannelListScreen.toBeVisible();
                if (!this.lastChannelName) {
                    throw new Error('ensureOnChannelScreen: on channel list but lastChannelName unset');
                }
                await ChannelScreen.open(this.CHANNELS_CATEGORY, this.lastChannelName);
            }
        }
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
        await this.bringIntoView(button);
        await waitFor(button).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await button.tap();
        await wait(timeouts.TWO_SEC);
    }

    static async tapMmBlocksStaticSelect(actionId: string): Promise<void> {
        const selectButton = element(by.id(`mm_blocks.static_select.${actionId}.select.button`));
        await waitFor(selectButton).toExist().withTimeout(timeouts.TEN_SEC);
        await this.bringIntoView(selectButton);
        await waitFor(selectButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await selectButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
    }

    static async selectStaticOption(optionText: string): Promise<void> {
        const optionElement = element(by.text(optionText));
        await waitFor(optionElement).toExist().withTimeout(timeouts.TEN_SEC);
        await this.bringIntoView(optionElement);
        await waitFor(optionElement).toBeVisible().withTimeout(timeouts.TEN_SEC);
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
        const {post: rootPost, error} = await Post.apiFindPostInChannelByMessage(siteOneUrl, channelId, postMessage);
        if (error || !rootPost?.id) {
            throw new Error(`[mm_blocks] Failed to find root post for marker "${postMessage}"`);
        }
        await this.openThreadForPost(rootPost.id, postMessage);
    }

    static async openThreadForPost(postId: string, postMessage: string): Promise<void> {
        // Hard-bound budget: stacked longPress retries previously burned the 300s Jest
        // timeout (CI 59ec6ae). Prefer date_time with maxAttempts=2, then one fallback.
        const deadline = Date.now() + timeouts.ONE_MIN;
        const postTestID = `channel.post_list.post.${postId}`;
        const scroll = by.id(ChannelScreen.postList.testID.flatList);
        const header = element(by.id('post_header.date_time').withAncestor(by.id(postTestID)));

        try {
            await waitFor(header).toExist().withTimeout(timeouts.FIVE_SEC);
            await longPressWithScrollRetry(
                header,
                scroll,
                PostOptionsScreen.postOptionsScreen,
                2,
                deadline,
            );
            await PostOptionsScreen.replyPostOption.tap();
            await ThreadScreen.toBeVisible();
            return;
        } catch {
            await this.dismissPostOptionsIfOpen();
        }

        if (Date.now() > deadline) {
            const reason = `exhausted thread-open budget for post ${postId}`;
            this.blockSuite(reason);
            throw new Error(`[mm_blocks] ${reason}`);
        }

        try {
            await ChannelScreen.openReplyThreadFor(postId, postMessage);
            await ThreadScreen.toBeVisible();
        } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            this.blockSuite(`openThreadForPost failed for ${postId}: ${detail}`);
            throw error;
        }
    }

    static randomMarker(prefix: string): string {
        return `${prefix} ${getRandomId()}`;
    }
}
