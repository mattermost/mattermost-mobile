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

    afterEach(async () => {
        // # Never carry airplane mode into the next test. In run 34472384034 (attempt 1)
        // MM-T416_1 timed out before its own goOnline, so MM-T416_2 started offline with
        // _1's post still pending: _1's failed indicator then appeared during _2's wait,
        // _2 matched it (post.failed.button is not scoped to a post), deleted _1's post,
        // and _2's own post was re-sent on reconnect. goOnline is idempotent when already
        // online (airplane-mode disable is a no-op and the reachability poll returns at once).
        await goOnline(serverOneUrl);
    });

    afterAll(async () => {
        // # Restore network and log out — goOnline polls until connectivity is
        // verified, so a failure mid-test cannot leave the host blocked. Leave the
        // channel first: the tab bar is hidden inside it and logout needs the account tab.
        await goOnline(serverOneUrl);
        await ChannelScreen.back();
        await HomeScreen.logout();
    });

    // How long an offline send can take before the app marks the post failed. This is the
    // client's retry chain, which is finite but wide, not a guess at CI timing:
    //   - react-native-network-client RetryInterceptor replays every IOException for POST
    //     while attempts <= retryLimit (app DEFAULT_CONFIG: 3), so four attempts, with
    //     ExponentialRetryInterceptor backoff 2^n * 0.5 s = 1 + 2 + 4 = 7 s between them.
    //   - The app sets no timeoutIntervalForRequest, so TimeoutInterceptor keeps its
    //     defaults: read and write timeout 60 s. OkHttp's connect timeout is its default 10 s.
    //   - What each attempt costs under airplane mode depends on state the test cannot see.
    //     Measured in run 34472384034 on one emulator, minutes apart, same code:
    //       MM-T416_1 attempt 2: send -> "Error sending a post" in 7.3 s (resolver fails at once)
    //       MM-T416_1 attempt 1: 67.3 s (resolver blocked ~15 s per attempt: 4 x 15 + 7)
    //       MM-T416_2 attempt 2: no error within the 60 s wait at all
    //     MM-T416_2 is the worst case by construction: goOnline() just re-established
    //     connections, so the POST is written into a pooled socket that airplane mode has
    //     silently cut, and the first attempt only fails at the 60 s read timeout. Then three
    //     fresh attempts at up to ~15 s each, plus backoff: 60 + 3 x 15 + 7 = 112 s.
    // 150 s covers that with margin for OkHttp's own retryOnConnectionFailure route retry.
    // props.failed is terminal (app/actions/remote/post.ts), so a wider wait cannot hide a
    // defect: the indicator arrives when the retries are exhausted or it never arrives.
    // Bounds that did NOT hold, so they are not retried: 30 s and 60 s (both assumed a
    // per-attempt cost that CI does not guarantee).
    const FAILED_POST_TIMEOUT = timeouts.TWO_MIN + timeouts.HALF_MIN;

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

        // * Verify the post failed (failed indicator appears); see FAILED_POST_TIMEOUT
        const failedButton = element(by.id('post.failed.button'));
        await waitFor(failedButton).toBeVisible().withTimeout(FAILED_POST_TIMEOUT);

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

        // * Precondition: no failed post is on screen from MM-T416_1. post.failed.button is
        // not scoped to a post, so a leftover would be matched below and the wrong post
        // deleted; fail here, with the cause named, instead of at the final assertion.
        const failedButton = element(by.id('post.failed.button'));
        await expect(failedButton).not.toExist();

        // # Disable the network and send a message while offline
        await goOffline(serverOneUrl);
        await ChannelScreen.composePostDraft(message);
        await ChannelScreen.tapSendButton();

        // * Verify the post failed (failed indicator appears); see FAILED_POST_TIMEOUT. The
        // keyboard is not the reason this can be slow: a prior "dismiss keyboard" fix did not
        // hold because the element was absent, not occluded.
        await waitFor(failedButton).toBeVisible().withTimeout(FAILED_POST_TIMEOUT);

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
