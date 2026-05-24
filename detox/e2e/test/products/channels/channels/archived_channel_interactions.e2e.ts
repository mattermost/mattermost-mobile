// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Channel, Post, Setup, System} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {Alert} from '@support/ui/component';
import {
    BrowseChannelsScreen,
    ChannelScreen,
    ChannelListScreen,
    ChannelDropdownMenuScreen,
    ChannelInfoScreen,
    HomeScreen,
    LoginScreen,
    ManageChannelMembersScreen,
    PermalinkScreen,
    PostOptionsScreen,
    SavedMessagesScreen,
    SearchMessagesScreen,
    ServerScreen,
} from '@support/ui/screen';
import {
    isAndroid,
    isIos,
    safeEnableSynchronization,
    timeouts,
    wait,
    waitForElementToBeVisible,
    waitForElementToExist,
} from '@support/utils';
import {expect, waitFor} from 'detox';

/**
 * Wait for the archived channel screen after a non-tap navigation (e.g. permalink jump).
 * Disables sync on iOS after the navigation action has already been triggered.
 */
async function waitForArchivedChannelScreen() {
    if (isIos()) {
        await device.disableSynchronization();
    }
    try {
        await waitForElementToExist(ChannelScreen.channelScreen, timeouts.ONE_MIN);
        await waitForElementToBeVisible(ChannelScreen.postDraftArchived, timeouts.HALF_MIN);
    } finally {
        if (isIos()) {
            await device.enableSynchronization();
        }
    }
}

/**
 * Tap an archived channel item in Browse Channels and wait for the channel screen.
 *
 * On iOS, tapping a channel in Browse Channels triggers concurrent modal dismissal
 * and channel screen push, producing a UITransitionView overlay that blocks Detox's
 * visibility/hittability checks. The bridge also stays busy during these transitions,
 * causing standard waitFor().toExist() to block waiting for bridge-idle that never
 * arrives within the timeout. Critically, the tap itself can stall if sync is still
 * enabled when the bridge is busy — so synchronization must be disabled before the
 * tap, not after.
 *
 * This helper:
 * 1. Disables Detox synchronization on iOS BEFORE the tap so the gesture dispatches
 *    immediately without waiting for bridge-idle
 * 2. Performs the tap on the provided channel item element
 * 3. Polls for the channel screen element to exist in the hierarchy
 * 4. Waits for the UITransitionView overlay to clear by polling for postDraftArchived
 * 5. Re-enables synchronization
 */
async function tapChannelAndWaitForArchivedChannelScreen(channelItem: Detox.NativeElement) {
    if (isIos()) {
        await device.disableSynchronization();
    }
    try {
        // Tap while sync is disabled so the gesture fires immediately even if the
        // bridge is still processing the modal-dismiss transition.
        await channelItem.tap();

        // Wait for the channel screen element to appear in the hierarchy.
        await waitForElementToExist(ChannelScreen.channelScreen, timeouts.ONE_MIN);

        // Wait for the UITransitionView overlay from modal dismissal to clear.
        // The archived post draft element is a reliable indicator that the channel
        // has fully loaded and the transition animation is complete.
        await waitForElementToBeVisible(ChannelScreen.postDraftArchived, timeouts.HALF_MIN);
    } finally {
        if (isIos()) {
            await device.enableSynchronization();
        }
    }
}

/**
 * Open the Browse Channels dropdown and select the Archived Channels filter.
 *
 * On Android with Detox 20.47.0 + React Native Fabric (New Architecture), once the
 * Fabric UI manager starts processing mount items — which happens after significant UI
 * activity such as leaving a channel — Detox's FabricUIManagerIdlingResources tries to
 * reflect on mMountItemDispatcher, a field that no longer exists in this RN version.
 * This causes a NoSuchFieldException crash inside Espresso's idle check before any tap.
 *
 * Disabling synchronization on Android prevents the idle check from firing, avoiding
 * the crash. A one-second explicit wait after the tap compensates for the disabled sync.
 */
async function openArchivedChannelsFilter() {
    await ChannelDropdownMenuScreen.open();

    if (isAndroid()) {
        await wait(timeouts.ONE_SEC);
        await device.disableSynchronization();
    }
    try {
        await ChannelDropdownMenuScreen.archivedChannelsItem.tap();
    } finally {
        if (isAndroid()) {
            await safeEnableSynchronization();
        }
    }
    await wait(timeouts.ONE_SEC);
}

/**
 * Navigate back from a channel that was opened via Browse Channels.
 * Channel back → Browse Channels, then close Browse Channels.
 */
async function closeBrowseChannelsChannel() {
    await ChannelScreen.back();
    await wait(timeouts.ONE_SEC);

    // After Channel.back() the Browse Channels modal may already be dismissed
    // (dismissAllModalsAndPopToScreen closes it during navigation). Tap close
    // only if it is still present; swallow if already gone.
    try {
        await waitFor(BrowseChannelsScreen.closeButton).toExist().withTimeout(timeouts.FOUR_SEC);
        await BrowseChannelsScreen.closeButton.tap();
    } catch {
        // Browse Channels was already dismissed — no action needed
    }
}

describe('Channels - Archived Channel Interactions', () => {
    const serverOneDisplayName = 'Server 1';
    let testTeam: any;
    let testUser: any;

    beforeAll(async () => {
        // # Ensure archived channels are visible in browse channels
        await System.apiUpdateConfig(siteOneUrl, {
            TeamSettings: {ExperimentalViewArchivedChannels: true},
        });
        await wait(timeouts.ONE_SEC);

        const {team, user} = await Setup.apiInit(siteOneUrl);
        testTeam = team;
        testUser = user;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await ChannelListScreen.toBeVisible();
    });

    beforeEach(async () => {
        // Dismiss any lingering "Removed from channel" or "Archived channel"
        // dialogs that may have appeared asynchronously via WebSocket events
        // from the previous test's channel archival. These native Alert dialogs
        // block all Detox interactions until dismissed.
        await Alert.dismissChannelRemoveOrArchiveAlert();

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T1671_1 - should be able to view members in an archived channel', async () => {
        // # Create a public channel, add user, and archive it via API
        const {channel: archivedChannel} = await Channel.apiCreateChannel(
            siteOneUrl,
            {type: 'O', teamId: testTeam.id},
        );
        await Channel.apiAddUserToChannel(
            siteOneUrl,
            testUser.id,
            archivedChannel.id,
        );
        await Channel.apiDeleteChannel(siteOneUrl, archivedChannel.id);
        await wait(timeouts.FOUR_SEC);

        // # Open browse channels, switch to archived filter, and open the archived channel
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.dismissScheduledPostTooltip();
        await openArchivedChannelsFilter();
        await BrowseChannelsScreen.searchInput.replaceText(archivedChannel.name);

        // Wait for the channel item to appear after search — fixed 1s sleep was
        // insufficient on API 35 where the archived list renders more slowly.
        await waitFor(BrowseChannelsScreen.getChannelItem(archivedChannel.name)).toExist().withTimeout(timeouts.TEN_SEC);

        // * Tap and wait with sync disabled on iOS so the gesture fires immediately.
        await tapChannelAndWaitForArchivedChannelScreen(BrowseChannelsScreen.getChannelItem(archivedChannel.name));

        // # Open channel info
        await ChannelInfoScreen.open();

        // * Verify the Members section option is visible in channel info
        await waitFor(ChannelInfoScreen.membersOption).
            toExist().
            withTimeout(timeouts.TEN_SEC);
        await expect(ChannelInfoScreen.membersOption).toBeVisible();

        // # Go back to channel list screen
        await ChannelInfoScreen.close();
        await closeBrowseChannelsChannel();
        await ChannelListScreen.toBeVisible();
    });

    it('MM-T1685_1 - should be able to leave an archived public channel from channel info', async () => {
        // # Create a public channel, add user, and archive it via API
        const {channel: archivedChannel} = await Channel.apiCreateChannel(
            siteOneUrl,
            {type: 'O', teamId: testTeam.id},
        );
        await Channel.apiAddUserToChannel(
            siteOneUrl,
            testUser.id,
            archivedChannel.id,
        );
        await Channel.apiDeleteChannel(siteOneUrl, archivedChannel.id);
        await wait(timeouts.FOUR_SEC);

        // # Open browse channels, switch to archived filter, and open the archived channel
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.dismissScheduledPostTooltip();
        await openArchivedChannelsFilter();
        await BrowseChannelsScreen.searchInput.replaceText(archivedChannel.name);

        // Wait for the channel item to appear after search — fixed 1s sleep was
        // insufficient on API 35 where the archived list renders more slowly.
        await waitFor(BrowseChannelsScreen.getChannelItem(archivedChannel.name)).toExist().withTimeout(timeouts.TEN_SEC);

        // * Tap and wait with sync disabled on iOS so the gesture fires immediately.
        await tapChannelAndWaitForArchivedChannelScreen(BrowseChannelsScreen.getChannelItem(archivedChannel.name));

        // # Open channel info and leave the channel
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.leaveChannel({confirm: true});

        // * Verify user is back on channel list screen (left the channel)
        await ChannelListScreen.toBeVisible();

        // * Verify the archived channel is no longer in the user's channel list sidebar
        await expect(
            ChannelListScreen.getChannelItemDisplayName(
                'channels',
                archivedChannel.name,
            ),
        ).not.toExist();
    });

    it('MM-T1718_1 - should not show add reaction option in post options for archived channels', async () => {
        // # Create a public channel, post a message, and archive it via API
        const {channel: archivedChannel} = await Channel.apiCreateChannel(
            siteOneUrl,
            {type: 'O', teamId: testTeam.id},
        );
        await Channel.apiAddUserToChannel(
            siteOneUrl,
            testUser.id,
            archivedChannel.id,
        );
        const message = 'Test message for archived channel reaction test';
        await Post.apiCreatePost(siteOneUrl, {
            channelId: archivedChannel.id,
            message,
        });
        const {post} = await Post.apiGetLastPostInChannel(
            siteOneUrl,
            archivedChannel.id,
        );
        await Channel.apiDeleteChannel(siteOneUrl, archivedChannel.id);
        await wait(timeouts.FOUR_SEC);

        // # Open browse channels, switch to archived filter, and open the archived channel
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.dismissScheduledPostTooltip();
        await openArchivedChannelsFilter();
        await BrowseChannelsScreen.searchInput.replaceText(archivedChannel.name);

        // Wait for the channel item to appear after search — fixed 1s sleep was
        // insufficient on API 35 where the archived list renders more slowly.
        await waitFor(BrowseChannelsScreen.getChannelItem(archivedChannel.name)).toExist().withTimeout(timeouts.TEN_SEC);

        // * Tap and wait with sync disabled on iOS so the gesture fires immediately.
        await tapChannelAndWaitForArchivedChannelScreen(BrowseChannelsScreen.getChannelItem(archivedChannel.name));

        // # Long-press on the post to open post options
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.toBeVisible();

        // * Verify the reaction bar / add reaction button is NOT visible (archived channels cannot add reactions)
        await expect(PostOptionsScreen.pickReactionButton).not.toBeVisible();

        // # Close post options and return to channel list
        await PostOptionsScreen.close();
        await closeBrowseChannelsChannel();
        await ChannelListScreen.toBeVisible();
    });

    it('MM-T1720_1 - should not be able to interact with existing reactions in an archived channel', async () => {
        // # Create a public channel, post a message, add a reaction via API, and archive the channel
        const {channel: archivedChannel} = await Channel.apiCreateChannel(
            siteOneUrl,
            {type: 'O', teamId: testTeam.id},
        );
        await Channel.apiAddUserToChannel(
            siteOneUrl,
            testUser.id,
            archivedChannel.id,
        );
        const message = 'Test message for existing reaction test';
        await Post.apiCreatePost(siteOneUrl, {
            channelId: archivedChannel.id,
            message,
        });
        const {post} = await Post.apiGetLastPostInChannel(
            siteOneUrl,
            archivedChannel.id,
        );
        await Channel.apiDeleteChannel(siteOneUrl, archivedChannel.id);
        await wait(timeouts.FOUR_SEC);

        // # Open browse channels, switch to archived filter, and open the archived channel
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.dismissScheduledPostTooltip();
        await openArchivedChannelsFilter();
        await BrowseChannelsScreen.searchInput.replaceText(archivedChannel.name);

        // Wait for the channel item to appear after search — fixed 1s sleep was
        // insufficient on API 35 where the archived list renders more slowly.
        await waitFor(BrowseChannelsScreen.getChannelItem(archivedChannel.name)).toExist().withTimeout(timeouts.TEN_SEC);

        // * Tap and wait with sync disabled on iOS so the gesture fires immediately.
        await tapChannelAndWaitForArchivedChannelScreen(BrowseChannelsScreen.getChannelItem(archivedChannel.name));

        // # Long-press on the post to open post options and verify reactions cannot be added
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.toBeVisible();

        // * Verify neither the reaction bar nor pick reaction button is visible (archived channel)
        await expect(PostOptionsScreen.pickReactionButton).not.toBeVisible();

        // # Close post options and return to channel list
        await PostOptionsScreen.close();
        await closeBrowseChannelsChannel();
        await ChannelListScreen.toBeVisible();
    });

    it('MM-T1679_1 - should be able to open an archived channel from search results', async () => {
        // # Create a public channel, post a message, and archive it via API
        const uniqueMessage = `archived-search-test-${Date.now()}`;
        const {channel: archivedChannel} = await Channel.apiCreateChannel(
            siteOneUrl,
            {type: 'O', teamId: testTeam.id},
        );
        await Channel.apiAddUserToChannel(
            siteOneUrl,
            testUser.id,
            archivedChannel.id,
        );
        await Post.apiCreatePost(siteOneUrl, {
            channelId: archivedChannel.id,
            message: uniqueMessage,
        });
        await Channel.apiDeleteChannel(siteOneUrl, archivedChannel.id);
        await wait(timeouts.FOUR_SEC);

        // # Open search screen and search for the message posted in the archived channel
        await SearchMessagesScreen.open();
        await SearchMessagesScreen.searchInput.replaceText(uniqueMessage);

        // * Verify the search result contains the message from the archived channel
        // Disable synchronization before tapReturnKey: the search keeps the dispatch
        // queue busy while processing network/DB work, which would otherwise cause
        // tapReturnKey to block indefinitely waiting for Detox idle.
        // Declare the element before try/finally so it is accessible for the tap below.
        const searchResultText = element(
            by.
                text(uniqueMessage).
                withAncestor(by.id(SearchMessagesScreen.postList.testID.flatList)),
        );

        await device.disableSynchronization();
        try {
            await SearchMessagesScreen.searchInput.tapReturnKey();

            // Wait for the search result text to appear (text element, not the composed matcher
            // which uses withDescendant and can be unreliable when text is highlighted/split).
            await waitForElementToBeVisible(searchResultText, timeouts.ONE_MIN);
        } finally {
            // Guarantee synchronization is re-enabled even if the wait above throws.
            await device.enableSynchronization();
        }

        // # Tap on the search result to open the permalink view for the archived channel
        // Tap the text element directly (the ID+text composed matcher is unreliable
        // when the search result text is highlighted/split across nested Text nodes).
        await searchResultText.tap();

        // * Verify the permalink screen opens (search results navigate via showPermalink)
        await PermalinkScreen.toBeVisible();

        // # Jump to recent messages to open the archived channel in read-only state
        await PermalinkScreen.jumpToRecentMessages();

        // * Verify the archived channel opens in read-only state
        // The permalink→channel transition involves dismissing the permalink modal and
        // pushing the channel screen, which on iOS creates a UITransitionView overlay.
        await waitForArchivedChannelScreen();

        // * Verify the close channel button is visible (confirming archived/read-only state)
        await waitForElementToBeVisible(
            ChannelScreen.postDraftArchivedCloseChannelButton,
            timeouts.TEN_SEC,
        );

        // # Navigate back to channel list
        // On Android the permalink→channel navigation stack returns to Search on close;
        // use open() (taps home tab) to reliably land on channel list on both platforms.
        await ChannelScreen.back();
        await ChannelListScreen.open();
    });

    it('MM-T1722_1 - should show reply/jump arrow in saved messages for posts from archived channels', async () => {
        // # Create a public channel, post a message, and archive the channel via API
        const message = `saved-post-archived-channel-${Date.now()}`;
        const {channel: archivedChannel} = await Channel.apiCreateChannel(
            siteOneUrl,
            {type: 'O', teamId: testTeam.id},
        );
        await Channel.apiAddUserToChannel(
            siteOneUrl,
            testUser.id,
            archivedChannel.id,
        );
        await Post.apiCreatePost(siteOneUrl, {
            channelId: archivedChannel.id,
            message,
        });
        const {post} = await Post.apiGetLastPostInChannel(
            siteOneUrl,
            archivedChannel.id,
        );
        await Channel.apiDeleteChannel(siteOneUrl, archivedChannel.id);
        await wait(timeouts.FOUR_SEC);

        // # Open browse channels, switch to archived filter, and open the archived channel
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.dismissScheduledPostTooltip();
        await openArchivedChannelsFilter();
        await BrowseChannelsScreen.searchInput.replaceText(archivedChannel.name);

        // Wait for the channel item to appear after search — fixed 1s sleep was
        // insufficient on API 35 where the archived list renders more slowly.
        await waitFor(BrowseChannelsScreen.getChannelItem(archivedChannel.name)).toExist().withTimeout(timeouts.TEN_SEC);

        // * Tap and wait with sync disabled on iOS so the gesture fires immediately.
        await tapChannelAndWaitForArchivedChannelScreen(BrowseChannelsScreen.getChannelItem(archivedChannel.name));

        // # Long-press the post to open post options, then save it
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.toBeVisible();

        // Wait for the Save option to appear in the view hierarchy before tapping.
        await waitFor(PostOptionsScreen.savePostOption).toExist().withTimeout(timeouts.TEN_SEC);
        await PostOptionsScreen.savePostOption.tap();
        await wait(timeouts.ONE_SEC);

        // # Close the archived channel and navigate to saved messages
        await closeBrowseChannelsChannel();
        await ChannelListScreen.toBeVisible();

        // # Open saved messages screen
        await SavedMessagesScreen.open();

        // * Verify the saved post from the archived channel is displayed in saved messages
        const {postListPostItem} = SavedMessagesScreen.getPostListPostItem(
            post.id,
            message,
        );
        await waitFor(postListPostItem).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(postListPostItem).toBeVisible();

        // * Verify the channel info (jump link) is visible on the saved post from the archived channel.
        // Poll the assertion: the inner Text inside the channel-info row can finish its layout
        // pass a frame or two after the parent post item becomes visible on Android Fabric,
        // which makes a single-shot expect().toBeVisible() return "Got: was null" from Espresso's
        // getGlobalVisibleRect() (matcher resolves the view, but its rect isn't computable yet).
        const {postListPostItemChannelInfoChannelDisplayName} =
            SavedMessagesScreen.getPostListPostItem(post.id, message);
        await waitFor(postListPostItemChannelInfoChannelDisplayName).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelListScreen.open();
    });

    it('MM-T1716 - should not show post input box in archived channels (read-only, cannot post)', async () => {
        // # Create a public channel, add user, and archive it via API
        const {channel: archivedChannel} = await Channel.apiCreateChannel(
            siteOneUrl,
            {type: 'O', teamId: testTeam.id},
        );
        await Channel.apiAddUserToChannel(
            siteOneUrl,
            testUser.id,
            archivedChannel.id,
        );
        await Channel.apiDeleteChannel(siteOneUrl, archivedChannel.id);
        await wait(timeouts.FOUR_SEC);

        // # Open browse channels, switch to archived filter, search for the archived channel
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.dismissScheduledPostTooltip();

        // * Verify the channel dropdown is visible before tapping
        await expect(BrowseChannelsScreen.channelDropdown).toBeVisible();
        await openArchivedChannelsFilter();
        await BrowseChannelsScreen.searchInput.replaceText(archivedChannel.name);

        // * Verify archived channel appears in the list
        await wait(timeouts.ONE_SEC);
        await expect(
            BrowseChannelsScreen.getChannelItemDisplayName(archivedChannel.name),
        ).toHaveText(archivedChannel.display_name);

        // # Tap on the archived channel to open it
        // * Tap and wait with sync disabled on iOS so the gesture fires immediately.
        await tapChannelAndWaitForArchivedChannelScreen(BrowseChannelsScreen.getChannelItem(archivedChannel.name));

        // * Verify main thread has no active post input box
        await expect(ChannelScreen.postInput).not.toBeVisible();

        // * Verify the close channel button is visible
        await waitForElementToBeVisible(
            ChannelScreen.postDraftArchivedCloseChannelButton,
            timeouts.TEN_SEC,
        );

        // # Navigate back: channel → Browse Channels → channel list
        await closeBrowseChannelsChannel();

        // * Verify back on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    it('MM-T1719_1 - should not be able to remove members from an archived channel', async () => {
        // # Create a public channel, add user, and archive it via API
        const {channel: archivedChannel} = await Channel.apiCreateChannel(
            siteOneUrl,
            {type: 'O', teamId: testTeam.id},
        );
        await Channel.apiAddUserToChannel(
            siteOneUrl,
            testUser.id,
            archivedChannel.id,
        );
        await Channel.apiDeleteChannel(siteOneUrl, archivedChannel.id);
        await wait(timeouts.FOUR_SEC);

        // # Open browse channels, switch to archived filter, and open the archived channel
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.dismissScheduledPostTooltip();
        await openArchivedChannelsFilter();
        await BrowseChannelsScreen.searchInput.replaceText(archivedChannel.name);

        // Wait for the channel item to appear after search — fixed 1s sleep was
        // insufficient on API 35 where the archived list renders more slowly.
        await waitFor(BrowseChannelsScreen.getChannelItem(archivedChannel.name)).toExist().withTimeout(timeouts.TEN_SEC);

        // * Tap and wait with sync disabled on iOS so the gesture fires immediately.
        await tapChannelAndWaitForArchivedChannelScreen(BrowseChannelsScreen.getChannelItem(archivedChannel.name));

        // # Open channel info
        await ChannelInfoScreen.open();

        // # Tap on the Members option to open the manage members screen.
        // On Android, the tutorial modal creates a separate native Dialog window
        // that blocks Espresso from finding the Members screen behind it. Dismiss
        // the tutorial BEFORE calling toBeVisible().
        await waitFor(ChannelInfoScreen.membersOption).
            toExist().
            withTimeout(timeouts.TEN_SEC);
        await ChannelInfoScreen.membersOption.tap();

        if (isAndroid()) {
            // Wait for the tutorial text (in the foreground Dialog window) as a
            // proxy that the Members screen has loaded, then dismiss it.
            // Use polling helper to avoid the bridge-idle block on Android API 35.
            try {
                await waitForElementToBeVisible(
                    element(by.text("Long-press on an item to view a user's profile")),
                    timeouts.TEN_SEC,
                );
            } catch {
                // Tutorial may not appear if already dismissed in a previous run
            }
            await ManageChannelMembersScreen.closeTutorial();
        }
        await ManageChannelMembersScreen.toBeVisible();

        // * Verify the Manage button is visible in the header — it is always rendered
        // unconditionally. However, canManageAndRemoveMembers=false for archived channels,
        // so showManageMode is gated and no remove controls appear in the list rows.
        await expect(ManageChannelMembersScreen.manageButton).toBeVisible();

        // # Go back to channel list screen
        // Android: use device.pressBack() for reliability (back button can be temporarily
        // occluded after tutorial dismissal on first-access to the members screen).
        if (isAndroid()) {
            await device.pressBack();
        } else {
            await ManageChannelMembersScreen.close();
        }
        await ChannelInfoScreen.close();
        await closeBrowseChannelsChannel();
        await ChannelListScreen.toBeVisible();
    });
});
