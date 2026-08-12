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
    InteractiveDialogScreen,
    LoginScreen,
    MmBlocksTextInputScreen,
    PostOptionsScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {
    getRandomId,
    isAndroid,
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
    static readonly FORM_VALUES_OK_MESSAGE = /.*Detox mm_blocks form_values OK.*/;
    static readonly DIALOG_SUBMIT_OK_MESSAGE = /.*Detox mm_blocks dialog submit OK.*/;
    static readonly DIALOG_CANCELLED_MESSAGE = /.*Detox mm_blocks dialog cancelled.*/;
    static readonly DIALOG_TOP_LEVEL_ERROR = 'Detox mm_blocks dialog top-level error';

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
                'Configure MM_MOBILE_E2E_WEBHOOK_PUBLIC_BASE_URL_IOS / _ANDROID for stable Mattermost→sidecar callbacks.',
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

    /**
     * Wraps Setup.apiInit (team + channel + user), then logs in and opens the channel.
     * Prefer returning to ChannelListScreen between tests and re-opening the channel.
     */
    static async setupChannelTest(): Promise<{
        channel: {id: string; name: string; display_name: string};
        team: {id: string; name?: string};
        user: {id: string; username: string};
    }> {
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
        // A blocks dialog is a modal over the post list, so scroll the dialog, not the list behind it.
        const dialogScroll = by.id(InteractiveDialogScreen.testID.scrollView);
        try {
            await waitFor(element(dialogScroll).atIndex(0)).toExist().withTimeout(timeouts.ONE_SEC);
            return dialogScroll;
        } catch {
            // No dialog on screen.
        }

        const threadList = by.id(ThreadScreen.postList.testID.flatList);
        try {
            await waitFor(element(threadList)).toExist().withTimeout(timeouts.ONE_SEC);
            return threadList;
        } catch {
            return by.id(ChannelScreen.postList.testID.flatList);
        }
    }

    private static async bringIntoView(target: Detox.NativeElement): Promise<void> {
        const container = await this.activeScrollContainer();
        try {
            await scrollElementIntoView(target, container);
        } catch {
            // Already on screen, or list is not scrollable further.
        }

        // Sticky dialog footer covers the bottom of the scroll viewport; after the first
        // scroll settles near the footer, nudge further so the target clears 25–50% visible.
        try {
            await waitFor(element(by.id(InteractiveDialogScreen.testID.scrollView)).atIndex(0)).
                toExist().
                withTimeout(timeouts.HALF_SEC);
            await element(by.id(InteractiveDialogScreen.testID.scrollView)).atIndex(0).scroll(200, 'down');
            await scrollElementIntoView(target, by.id(InteractiveDialogScreen.testID.scrollView));
        } catch {
            // Not in a dialog, or already as far as we can scroll.
        }
    }

    private static async dismissPostOptionsIfOpen(): Promise<void> {
        try {
            await waitFor(PostOptionsScreen.postOptionsScreen).toExist().withTimeout(timeouts.ONE_SEC);

            // PostOptionsScreen.close() swipes on iOS and presses back on Android;
            // device.pressBack() alone leaves the sheet open on iOS.
            await PostOptionsScreen.close();
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
        // Markers are often repeated as both the webhook post text and an mm_blocks text
        // block (postDialogButtonPost / postFormValuesEchoPost), so prefer the first match.
        await waitFor(element(by.text(text)).atIndex(0)).toExist().withTimeout(timeout);
    }

    static async waitForIntegrationOkMessage(timeout = timeouts.TWENTY_SEC): Promise<void> {
        try {
            await waitFor(element(by.text(this.INTEGRATION_OK_MESSAGE)).atIndex(0)).toExist().withTimeout(timeout);
        } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            this.blockSuite(`integration OK message not received within ${timeout}ms (${detail})`);
            throw error;
        }
    }

    static async waitForTextMatching(matcher: string | RegExp, timeout = timeouts.TEN_SEC): Promise<void> {
        await waitFor(element(by.text(matcher)).atIndex(0)).toExist().withTimeout(timeout);
    }

    /** Detox text matchers must match the whole node, so wrap a fragment for "contains". */
    static textContaining(fragment: string): RegExp {
        return new RegExp(`.*${fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*`);
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

    /**
     * Prefer dialog scroll content, then the thread list, then the channel list.
     * Dialog action buttons (Show errors / Next step / …) live below the sticky footer
     * and share no unique channel post ancestry.
     */
    private static async elementPreferringDialogOrThread(testID: string): Promise<Detox.NativeElement> {
        try {
            await waitFor(element(by.id(InteractiveDialogScreen.testID.scrollView)).atIndex(0)).
                toExist().
                withTimeout(timeouts.ONE_SEC);
            return element(by.id(testID).withAncestor(by.id(InteractiveDialogScreen.testID.scrollView)));
        } catch {
            return this.elementPreferringThread(testID);
        }
    }

    /**
     * Prefer the thread post list when a thread is open so channel-list copies of the same
     * mm_blocks field testIDs (from earlier posts) do not create ambiguous Detox matches.
     * Falls back to atIndex(0) in the channel so leftover posts that reused an action_id
     * (or field testID) do not fail the matcher before the tap.
     */
    private static async elementPreferringThread(testID: string): Promise<Detox.NativeElement> {
        try {
            await waitFor(element(by.id(ThreadScreen.postList.testID.flatList))).
                toExist().
                withTimeout(timeouts.ONE_SEC);
            return element(by.id(testID).withAncestor(by.id(ThreadScreen.postList.testID.flatList)));
        } catch {
            return element(by.id(testID)).atIndex(0);
        }
    }

    static async tapMmBlocksButton(actionId: string): Promise<void> {
        const button = await this.elementPreferringDialogOrThread(`mm_blocks.button.${actionId}`);
        await waitFor(button).toExist().withTimeout(timeouts.TEN_SEC);
        await this.bringIntoView(button);

        // Match scrollElementIntoView's Android threshold — dialog action rows often sit just
        // above the sticky Submit/Cancel footer and never reach Detox's default 50% visibility.
        const visibilityThreshold = isAndroid() ? 25 : 50;
        await waitFor(button).toBeVisible(visibilityThreshold).withTimeout(timeouts.TEN_SEC);
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

    // ****************************************************************
    // Form inputs and blocks dialogs
    // ****************************************************************

    /**
     * Post a webhook message carrying mm_blocks and (optionally) mm_blocks_actions.
     * Prefer this over building the props envelope in each spec.
     */
    static async postBlocksPost(
        channelId: string,
        options: {
            marker: string;
            blocks: Array<Record<string, unknown>>;
            actions?: Record<string, unknown>;
            displayName?: string;
        },
    ): Promise<void> {
        await this.postIncomingWebhookBlocks(
            channelId,
            options.displayName ?? 'Detox mm_blocks',
            {
                text: options.marker,
                props: {
                    mm_blocks: options.blocks,
                    ...(options.actions ? {mm_blocks_actions: options.actions} : {}),
                },
            },
        );
    }

    /**
     * Post form-input blocks plus a submit button wired to
     * /mm_blocks_integration_echo_form_values, so a spec can fill fields and assert
     * the values the server received. Returns the submit button's action id.
     */
    static async postFormValuesEchoPost(
        channelId: string,
        options: {
            marker: string;
            fields: Array<Record<string, unknown>>;
            submitLabel?: string;
            actionId?: string;
        },
    ): Promise<string> {
        const actionId = options.actionId ?? 'detox_form_values';

        await this.postBlocksPost(channelId, {
            marker: options.marker,
            blocks: [
                {type: 'text', text: options.marker},
                ...options.fields,
                {
                    type: 'button',
                    text: options.submitLabel ?? 'Submit form',
                    style: 'primary',
                    subtype: 'submit',
                    action_id: actionId,
                },
            ],
            actions: {
                [actionId]: {
                    type: 'external',
                    url: this.integrationUrl('/mm_blocks_integration_echo_form_values'),
                    context: {},
                },
            },
        });

        return actionId;
    }

    /**
     * Post a message with a button that opens a blocks dialog. Defaults to the
     * response path (`/mm_blocks_dialog_return`, type:dialog); pass
     * `integrationPath: '/mm_blocks_dialog_open'` for the dialogs/open + trigger_id path.
     * Returns the button's action id.
     */
    static async postDialogButtonPost(
        channelId: string,
        options: {
            marker: string;
            buttonText?: string;
            actionId?: string;
            integrationPath?: string;
            scenario?: string;
            context?: Record<string, unknown>;
        },
    ): Promise<string> {
        // Unique per post so later specs in the same channel do not match earlier
        // `mm_blocks.button.detox_dialog_open` copies (MM-T6271 after MM-T6270).
        const actionId = options.actionId ?? `detox_dialog_open_${getRandomId(6)}`;
        const buttonText = options.buttonText ?? 'Open dialog';

        await this.postBlocksPost(channelId, {
            marker: options.marker,
            blocks: [
                {type: 'text', text: options.marker},
                {
                    type: 'button',
                    text: buttonText,
                    style: 'primary',
                    action_id: actionId,
                },
            ],
            actions: {
                [actionId]: {
                    type: 'external',
                    url: this.integrationUrl(options.integrationPath ?? '/mm_blocks_dialog_return'),
                    context: {
                        marker: options.marker,
                        ...(options.scenario ? {scenario: options.scenario} : {}),
                        ...options.context,
                    },
                },
            },
        });

        return actionId;
    }

    /**
     * Tap a post button that opens a blocks dialog, then wait for the modal chrome.
     * The `dialogs/open` path adds a Mattermost→sidecar→websocket round trip, so callers
     * on that path should pass a longer timeout.
     */
    static async openBlocksDialogFromPost(actionId: string, timeout = timeouts.TEN_SEC): Promise<void> {
        await this.tapMmBlocksButton(actionId);
        await this.blocksDialogToBeVisible(true, timeout);
    }

    /**
     * Native block_dialog footers expose interactive_dialog.submit.button.
     * Fall back to the scroll view when the footer submit is absent (rare).
     */
    static async blocksDialogToBeVisible(visible = true, timeout = timeouts.TEN_SEC): Promise<void> {
        if (visible) {
            try {
                await waitFor(InteractiveDialogScreen.submitButton).toExist().withTimeout(timeout);
            } catch {
                await waitFor(InteractiveDialogScreen.scrollView).toExist().withTimeout(timeout);
            }
            return;
        }
        try {
            await waitFor(InteractiveDialogScreen.submitButton).not.toExist().withTimeout(timeout);
        } catch {
            await waitFor(InteractiveDialogScreen.scrollView).not.toExist().withTimeout(timeout);
        }
    }

    static async expectBlocksDialogTitle(title: string): Promise<void> {
        await waitFor(element(by.text(title))).toExist().withTimeout(timeouts.TEN_SEC);
    }

    static async submitBlocksDialog(): Promise<void> {
        await waitFor(InteractiveDialogScreen.submitButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await InteractiveDialogScreen.submitButton.tap();
        await wait(timeouts.TWO_SEC);
    }

    static async cancelBlocksDialog(): Promise<void> {
        await waitFor(InteractiveDialogScreen.cancelButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await InteractiveDialogScreen.cancelButton.tap();
        await wait(timeouts.TWO_SEC);
    }

    /** Dismiss the dialog with the header X instead of the cancel action. */
    static async closeBlocksDialog(): Promise<void> {
        await waitFor(InteractiveDialogScreen.closeButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await InteractiveDialogScreen.closeButton.tap();
        await wait(timeouts.TWO_SEC);
    }

    /**
     * afterEach guard: validation specs deliberately leave the modal up, and stacking specs
     * can leave a child over its parent, so dismiss whatever is still on screen.
     */
    static async dismissBlocksDialogIfOpen(maxDepth = 3): Promise<void> {
        const anyCloseButton = element(by.id(InteractiveDialogScreen.testID.closeButton)).atIndex(0);
        for (let i = 0; i < maxDepth; i++) {
            try {
                // Cheap existence probe first: the common case is nothing left to dismiss.
                // eslint-disable-next-line no-await-in-loop
                await waitFor(anyCloseButton).toExist().withTimeout(timeouts.ONE_SEC);

                // eslint-disable-next-line no-await-in-loop
                await this.tapTopmostVisible(InteractiveDialogScreen.testID.closeButton);
            } catch {
                return;
            }
        }
    }

    /**
     * A child dialog stacks over its parent, so dialog chrome testIDs may match more than once.
     * Detox has no "topmost" matcher: try higher indices first (child), and if wait/tap fails
     * (index out of range, or a covered parent that waitFor still treats as visible), fall
     * through to a lower index.
     */
    static async tapTopmostVisible(testID: string, maxDepth = 2): Promise<void> {
        for (let index = maxDepth - 1; index >= 0; index--) {
            const target = element(by.id(testID)).atIndex(index);
            try {
                // eslint-disable-next-line no-await-in-loop
                await waitFor(target).toBeVisible().withTimeout(timeouts.ONE_SEC);
                // eslint-disable-next-line no-await-in-loop
                await target.tap();
                // eslint-disable-next-line no-await-in-loop
                await wait(timeouts.TWO_SEC);
                return;
            } catch {
                continue;
            }
        }

        throw new Error(`[mm_blocks] tapTopmostVisible: no visible element for ${testID}`);
    }

    /**
     * In-post text_input fields are read-only rows that push the
     * MM_BLOCKS_TEXT_INPUT screen; inside a dialog they are inline TextSettings.
     */
    static async openTextInputScreen(fieldName: string): Promise<void> {
        const editButton = await this.elementPreferringThread(InteractiveDialogScreen.textInputEditButtonTestID(fieldName));
        await waitFor(editButton).toExist().withTimeout(timeouts.TEN_SEC);
        await this.bringIntoView(editButton);
        await waitFor(editButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await editButton.tap();
        await MmBlocksTextInputScreen.toBeVisible();
    }

    /** Fill and save the text input screen opened by openTextInputScreen. */
    static async saveTextInputScreen(value: string): Promise<void> {
        await waitFor(MmBlocksTextInputScreen.input).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // replaceText avoids the iOS paste-permission dialog (MM-66558).
        await MmBlocksTextInputScreen.input.replaceText(value);
        await MmBlocksTextInputScreen.saveButton.tap();
        await MmBlocksTextInputScreen.toBeVisible(false);
    }

    static async setPostTextInput(fieldName: string, value: string): Promise<void> {
        await this.openTextInputScreen(fieldName);
        await this.saveTextInputScreen(value);
    }

    /** text_input inside a blocks dialog renders an inline TextSetting. */
    static async setDialogTextInput(fieldName: string, value: string): Promise<void> {
        const input = element(by.id(`mm_blocks.text_input.${fieldName}.input`));
        await waitFor(input).toExist().withTimeout(timeouts.TEN_SEC);
        await this.bringIntoView(input);
        await input.replaceText(value);
        await wait(timeouts.ONE_SEC);
    }

    /** BoolSetting exposes its toggle as `.toggled.{currentValue}.button`. */
    static async toggleBoolInput(fieldName: string, currentValue: boolean): Promise<void> {
        const toggle = await this.elementPreferringThread(
            `mm_blocks.bool_input.${fieldName}.toggled.${currentValue}.button`,
        );
        await waitFor(toggle).toExist().withTimeout(timeouts.TEN_SEC);
        await this.bringIntoView(toggle);
        await toggle.tap();
        await wait(timeouts.ONE_SEC);
    }

    /** Non-expanded select fields push the integration selector screen. */
    static async openSelectInput(fieldName: string): Promise<void> {
        const selectButton = await this.elementPreferringThread(
            `mm_blocks.select_input.${fieldName}.select.button`,
        );
        await waitFor(selectButton).toExist().withTimeout(timeouts.TEN_SEC);
        await this.bringIntoView(selectButton);
        await waitFor(selectButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await selectButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
    }

    static async selectInputOption(fieldName: string, optionText: string): Promise<void> {
        await this.openSelectInput(fieldName);
        await this.selectStaticOption(optionText);
    }

    /**
     * Multiselect option rows expose the option *value* as their testID (see CustomListRow),
     * which is what we tap here: a selected option is also echoed as a chip carrying the same
     * label, so matching by text would be ambiguous after the first pick.
     */
    static async selectMultiInputOptions(fieldName: string, optionValues: string[]): Promise<void> {
        await this.openSelectInput(fieldName);
        for (const optionValue of optionValues) {
            // eslint-disable-next-line no-await-in-loop
            await this.tapSelectorOptionByValue(optionValue);
        }
        await IntegrationSelectorScreen.done();
    }

    /** Selectable rows render the value testID twice (checkbox + content), hence atIndex(0). */
    static async tapSelectorOptionByValue(optionValue: string): Promise<void> {
        const optionElement = element(by.id(optionValue)).atIndex(0);
        await waitFor(optionElement).toExist().withTimeout(timeouts.TEN_SEC);
        await optionElement.tap();
        await wait(timeouts.ONE_SEC);
    }

    static async selectMultiInputUser(fieldName: string, userId: string, username: string): Promise<void> {
        await this.openSelectInput(fieldName);
        await this.selectIntegrationUser(userId, username);
        await IntegrationSelectorScreen.done();
    }

    static async selectInputUser(fieldName: string, userId: string, username: string): Promise<void> {
        await this.openSelectInput(fieldName);
        await this.selectIntegrationUser(userId, username);
    }

    static async selectInputChannel(fieldName: string, channelId: string, searchTerm: string): Promise<void> {
        await this.openSelectInput(fieldName);
        await this.selectIntegrationChannel(channelId, searchTerm);
    }

    /** `data_source: 'dynamic'` selects resolve their options through the lookup integration. */
    static async searchAndSelectDynamicOption(fieldName: string, searchTerm: string, optionText: string): Promise<void> {
        await this.openSelectInput(fieldName);
        await IntegrationSelectorScreen.searchFor(searchTerm);
        await this.selectStaticOption(optionText);
    }

    /**
     * date_input / datetime_input only commit a value once the native picker emits onChange,
     * so drive it explicitly instead of just opening and closing it.
     */
    static async pickDialogDate(
        fieldName: string,
        isoDateTime: string,
        kind: 'date_input' | 'datetime_input' = 'date_input',
    ): Promise<void> {
        const selectButton = element(by.id(
            kind === 'datetime_input' ?
                InteractiveDialogScreen.dateTimeSelectButtonTestID(fieldName) :
                InteractiveDialogScreen.dateSelectButtonTestID(fieldName),
        ));
        await waitFor(selectButton).toExist().withTimeout(timeouts.TEN_SEC);
        await this.bringIntoView(selectButton);
        await waitFor(selectButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await selectButton.tap();

        await waitFor(InteractiveDialogScreen.nativeDateTimePicker).toExist().withTimeout(timeouts.TEN_SEC);
        await InteractiveDialogScreen.nativeDateTimePicker.setDatePickerDate(isoDateTime, 'ISO8601');
        await wait(timeouts.HALF_SEC);

        // Android renders the picker as a modal that must be confirmed; iOS keeps it inline.
        if (isAndroid()) {
            await element(by.text('OK')).tap();
        } else {
            await selectButton.tap();
        }
        await wait(timeouts.ONE_SEC);
    }

    /** `style: 'expanded'` select fields render RadioSetting rows instead. */
    static async selectRadioInputOption(fieldName: string, optionValue: string): Promise<void> {
        const option = await this.elementPreferringThread(
            `mm_blocks.select_input.${fieldName}.radio.${optionValue}.button`,
        );
        await waitFor(option).toExist().withTimeout(timeouts.TEN_SEC);
        await this.bringIntoView(option);
        await option.tap();
        await wait(timeouts.ONE_SEC);
    }

    /** Expanded multiselect fields render circular checklist rows. */
    static async toggleCheckInputOption(fieldName: string, optionValue: string): Promise<void> {
        const option = await this.elementPreferringThread(
            `mm_blocks.select_input.${fieldName}.check.${optionValue}.button`,
        );
        await waitFor(option).toExist().withTimeout(timeouts.TEN_SEC);
        await this.bringIntoView(option);
        await option.tap();
        await wait(timeouts.ONE_SEC);
    }

    /** `summary` is the `key=value` list the sidecar echoes back, sorted by key. */
    static async waitForFormValuesOkMessage(summary: string, timeout = timeouts.TWENTY_SEC): Promise<void> {
        try {
            await this.waitForPostText(`Detox mm_blocks form_values OK (${summary})`, timeout);
        } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            this.blockSuite(`form_values OK message not received for "${summary}" (${detail})`);
            throw error;
        }
    }

    static async waitForDialogSubmitOkMessage(summary: string, step?: string, timeout = timeouts.TWENTY_SEC): Promise<void> {
        const stepPart = step ? ` step=${step}` : '';
        try {
            await this.waitForPostText(`Detox mm_blocks dialog submit OK${stepPart} (${summary})`, timeout);
        } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            this.blockSuite(`dialog submit OK message not received for "${summary}" (${detail})`);
            throw error;
        }
    }

    static async waitForDialogCancelledMessage(reason = 'cancel', timeout = timeouts.TWENTY_SEC): Promise<void> {
        await this.waitForPostText(`Detox mm_blocks dialog cancelled (reason=${reason})`, timeout);
    }

    /**
     * Unscoped field-error match. Prefer expectDialogTextFieldError when the field name is known —
     * client-side validation often repeats the same message across required fields.
     */
    static async expectDialogFieldError(message: string): Promise<void> {
        await waitFor(element(by.text(message)).atIndex(0)).toExist().withTimeout(timeouts.TEN_SEC);
    }

    /**
     * Field errors render under the floating text input as `${field}.input.error`.
     * Assert presence via testID and message via text.
     */
    static async expectDialogTextFieldError(fieldName: string, message: string): Promise<void> {
        const error = by.id(`mm_blocks.text_input.${fieldName}.input.error`);
        await waitFor(element(error)).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(element(by.text(message).withAncestor(error))).toExist();
    }

    static async expectNoDialogTextFieldError(fieldName: string): Promise<void> {
        await expect(element(by.id(`mm_blocks.text_input.${fieldName}.input.error`))).not.toExist();
    }

    static async expectDialogTopLevelError(message = MmBlocksTestHelper.DIALOG_TOP_LEVEL_ERROR): Promise<void> {
        await waitFor(element(by.id(InteractiveDialogScreen.testID.error))).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(element(by.text(message))).toExist();
    }
}
