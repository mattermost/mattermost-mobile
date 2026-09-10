// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Post, Setup} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {goOffline, goOnline, isNetworkControlAvailable, timeouts, wait} from '@support/utils';
import {by, element, expect, waitFor} from 'detox';

// Offline has to make the app's requests genuinely fail, locally to the device under
// test; see support/utils/offline_simulation.ts. Android uses emulator airplane mode.
// iOS is refused by isNetworkControlAvailable(), because the Cloudflare-fronted servers
// answer AAAA from anycast and a pf block of resolved IPs cannot cover the address the
// app actually dials — the suite skips loudly there with the reason printed at runtime.
//
// Android was suite-skipped while the app red-boxed on a Fabric addViewAt reparent when
// the failed-post sheet's SlideUpPanelItem was pressed (run 34160726648). That crash is
// fixed on this branch (collapsable={false} on the SlideUpPanelItem row), so the gate is
// back: Android runs, iOS skips.
(isNetworkControlAvailable(serverOneUrl) ? describe : describe.skip)('Messaging - Pending Posts Offline', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await ChannelListScreen.toBeVisible();

        // # Open a channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);
    });

    afterAll(async () => {
        // # Restore network and log out — goOnline polls until connectivity is
        // verified, so a failure mid-test cannot leave the host blocked. Leave the
        // channel first: the tab bar is hidden inside it and logout needs the account tab.
        await goOnline(serverOneUrl);
        await ChannelScreen.back();
        await HomeScreen.logout();
    });

    // Zephyr MM-T416 has two steps on two failed posts: retry one, delete the other. They run
    // as two offline/online cycles with one failed post each. With two failed posts on screen
    // at once, post.failed.button matches twice and the pending posts carry client-side ids
    // the test cannot know, so there is no stable way to say which "i" belongs to which post.
    it('MM-T416_1 - should fail to post without network and re-send after network is restored', async () => {
        const message = `offline post ${Date.now()}`;

        // # Disable the network to simulate offline (verified unreachable by the
        // harness before proceeding — a silent block failure throws here)
        await goOffline(serverOneUrl);

        // # Compose and send a message while offline
        await ChannelScreen.composePostDraft(message);
        await ChannelScreen.tapSendButton();

        // * Verify the post failed (failed indicator appears)
        const failedButton = element(by.id('post.failed.button'));
        await waitFor(failedButton).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Restore network access (harness polls until the server is reachable)
        await goOnline(serverOneUrl);

        // # Tap the failed indicator and re-send the post
        await failedButton.tap();
        const retryOption = element(by.id('post.failed.retry'));
        await waitFor(retryOption).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await retryOption.tap();

        // # Dismiss the keyboard — on iOS it stays up after re-sending and covers
        // the bottom of the post list where the re-sent post renders.
        await ChannelScreen.dismissKeyboard();

        // * Verify the post is sent (message appears and failed indicator is gone)
        await waitFor(element(by.text(message))).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await waitFor(failedButton).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(element(by.text(message))).toBeVisible();
    });

    it('MM-T416_2 - should delete a failed post after network is restored without sending it', async () => {
        const message = `offline delete ${Date.now()}`;

        // # Give the emulator's radio state and the app's post-reconnect resync (WebSocket,
        // missed-message fetch) time to settle before toggling airplane mode again. Without
        // this, CI 34304338033 lost the Detox<->device connection outright for 60s while
        // waiting on the failed-post indicator below — identically on both the first attempt
        // and the automatic retry, so this is deterministic contention from the rapid
        // offline/online/offline cycle, not a one-off flake. goOnline() only confirms the
        // emulator can reach the server again; it does not wait for the app to finish
        // reacting to that recovery.
        await wait(timeouts.TWO_SEC);

        // # Disable the network and send a message while offline
        await goOffline(serverOneUrl);
        await ChannelScreen.composePostDraft(message);
        await ChannelScreen.tapSendButton();

        // # Dismiss the keyboard before asserting on the indicator. composePostDraft focuses
        // the input, so the keyboard is still up here, and unlike MM-T416_1 this channel
        // already holds that test's re-sent post — the list is taller and the newest failed
        // post renders lower, into the keyboard. The assertion below is a *visibility* one, so
        // an occluded-but-present indicator fails it: CI 34351941461 reported "10.0sec timeout
        // expired without matching ... covers at least <50> percent of the view's area", which
        // is occlusion, not absence. Same mechanism the re-send step below already documents.
        await ChannelScreen.dismissKeyboard();

        // * Verify the post failed (failed indicator appears)
        const failedButton = element(by.id('post.failed.button'));
        await waitFor(failedButton).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Restore network access
        await goOnline(serverOneUrl);

        // # Tap the failed indicator and delete the post
        await failedButton.tap();
        const deleteOption = element(by.id('post.failed.delete'));
        await waitFor(deleteOption).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await deleteOption.tap();
        await ChannelScreen.dismissKeyboard();

        // * Verify the post is removed locally and never reached the server
        await waitFor(element(by.text(message))).not.toExist().withTimeout(timeouts.TEN_SEC);
        await waitFor(failedButton).not.toExist().withTimeout(timeouts.TEN_SEC);
        const {posts, error} = await Post.apiGetPostsInChannel(siteOneUrl, testChannel.id);
        if (error) {
            throw new Error(`Failed to read channel posts after delete: ${JSON.stringify(error)}`);
        }
        const leaked = posts.find((post: any) => post.message === message);
        if (leaked) {
            throw new Error(`Deleted failed post reached the server as ${leaked.id}`);
        }
    });
});
