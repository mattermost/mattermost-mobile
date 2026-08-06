// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-await-in-loop, no-empty */

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Command,
    ensureDemoPluginForDialogTests,
    Plugin,
    Setup,
    User,
    Post,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    IntegrationSelectorScreen,
    InteractiveDialogScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {wait, isAndroid, safeEnableSynchronization, timeouts, waitForElementToBeVisible} from '@support/utils';

// MM-66558: dialog fields use replaceText instead of typeText.

// ===== Helper Functions =====

// Selector rows differ per data source: user_list.user_item.<id>.<id>, channel_list.<id>,
// options by text. Tap the display_name id — by.text hits the search field instead.

async function ensureDialogClosed() {
    try {
        await waitFor(InteractiveDialogScreen.interactiveDialogScreen).not.toExist().withTimeout(3000);
    } catch {
        try {
            await InteractiveDialogScreen.cancel();
            await waitFor(InteractiveDialogScreen.interactiveDialogScreen).not.toExist().withTimeout(3000);
        } catch {}
    }

    // iOS 26+ may leave the keyboard rendered after dialog close even when no
    // input is focused, obscuring the post list and failing later visibility
    // checks. Tap empty space at the top of the post list scroll view to
    // defocus the input and retract the keyboard. Coordinates target an area
    // above any rendered post or the channel intro to avoid triggering
    // actions like "Edit Header".
    try {
        await element(by.id('channel.post_list.flat_list')).tapAtPoint({x: 200, y: 10});
        await wait(500);
    } catch {}

    // Swipe up on post list to reveal new posts that might be hidden behind input
    try {
        await element(by.id('channel.post_list.flat_list')).swipe('up', 'fast', 0.2);
        await wait(300);
    } catch {}

    // The defocus tap above can land on a post and open its thread, which would
    // strand the next test off the channel. If the channel post draft is no longer
    // visible, a thread (or other pushed screen) opened — back out of it.
    try {
        await waitFor(element(by.id('channel.post_draft.post.input'))).toBeVisible().withTimeout(2000);
    } catch {
        try {
            await element(by.id('navigation.header.back')).tap();
            await wait(500);
        } catch {}
    }
}

async function ensureDialogOpen() {
    // Disable sync so the bottom sheet animation does not block the poll.
    await device.disableSynchronization();
    try {
        await waitForElementToBeVisible(InteractiveDialogScreen.interactiveDialogScreen, timeouts.HALF_MIN);
    } finally {
        await safeEnableSynchronization();
    }
}

async function dismissErrorAlert() {
    try {
        isAndroid() ? await element(by.text('OK')).tap() : await element(by.label('OK')).atIndex(1);
        await wait(300);
    } catch {}
}

describe('Interactive Dialog - Basic Dialog (Plugin)', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

        await User.apiAdminLogin(siteOneUrl);
        await ensureDemoPluginForDialogTests(siteOneUrl);
        await Command.waitForSlashCommandTrigger(siteOneUrl, testChannel.team_id, 'dialog', {timeoutMs: 60000});

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await ChannelListScreen.toBeVisible();
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // Warm slash-command / IntegrationsManager state — first /dialog after login
        // can return "Error Executing Command" before commands are ready (CI MM-T4101/4102).
        try {
            await ChannelScreen.postInput.typeText('/');
            await wait(timeouts.TWO_SEC);
            await ChannelScreen.postInput.clearText();
        } catch { /* best-effort */ }
    });

    afterAll(async () => {
        try {
            await HomeScreen.logout();
        } catch {
            // best-effort logout so later specs on this shard start clean
        }
    });

    afterEach(async () => {
        await dismissErrorAlert();

        // Close an integration selector modal if one is stuck open (e.g.,
        // when a selectUser tap failed to fire). Cancel first, then try
        // done() if cancel didn't apply.
        try {
            await IntegrationSelectorScreen.cancel();
        } catch {}
        try {
            await IntegrationSelectorScreen.done();
        } catch {}
        try {
            await waitFor(InteractiveDialogScreen.interactiveDialogScreen).toExist().withTimeout(timeouts.HALF_SEC);
            await InteractiveDialogScreen.cancel();
        } catch {}

        // Android Back from cancel() after the dialog is already closed leaves channel list;
        // require composer, and re-enter the channel if cleanup drifted.
        try {
            await waitFor(ChannelScreen.postInput).toBeVisible().withTimeout(timeouts.TEN_SEC);
        } catch {
            await ChannelListScreen.toBeVisible();
            await ChannelScreen.open(channelsCategory, testChannel.name);
            await waitFor(ChannelScreen.postInput).toBeVisible().withTimeout(timeouts.TEN_SEC);
        }
        await wait(500);
    });

    // TODO: previously failed when selectUser tapped search-field text (CI 30250131265).

    // iOS-only skip carried over from the RF→Detox migration with no recorded failure;
    // Android still covers this case. Re-enable once the iOS path is re-verified.

    // TODO: iOS 26 + react-native-keyboard-controller contamination.
    // Field-refresh dialog with text inputs leaves keyboard/animation state that
    // poisons later tests with progressViewOffset: NaN in RCTRefreshControl.
    // Re-enable once the keyboard library handles iOS 26 transitions cleanly.

    it('MM-T2530H should accept manual time entry on datetime field', async () => {
        // NOTE: Placed last in the file — manual TextInput entry leaves keyboard/animation
        // state on iOS 26 + react-native-keyboard-controller that can break subsequent dialog tests.
        // # Open datetime-timezone dialog (has fields with allow_manual_time_entry)
        await ChannelScreen.postSlashCommand('/dialog datetime-timezone');
        await ensureDialogOpen();

        // # Scroll past introduction text to reveal fields
        try {
            await element(by.id('interactive_dialog.screen')).scroll(300, 'down');
            await wait(300);
        } catch {}

        // # Tap time button to switch local_manual into manual entry mode
        await element(by.id('AppFormElement.local_manual.time.button')).tap();
        await wait(500);

        // # Replace any prefilled text with the manual time entry (parseTimeString accepts 24-hour without am/pm)
        const manualInput = element(by.id('AppFormElement.local_manual.manual_time.input'));
        await waitFor(manualInput).toBeVisible().withTimeout(2000);
        await manualInput.replaceText('14:30');

        // # Commit by pressing Done — fires onSubmitEditing → handleManualTimeSubmit → handleChange
        await manualInput.tapReturnKey();
        await wait(500);

        // # Submit dialog
        await InteractiveDialogScreen.submit();
        await wait(1500);

        // * Dialog should close after successful submission
        await ensureDialogClosed();

        // * Verify submission post: local_manual must be populated with a UTC ISO timestamp
        // whose minute portion is 30 (manual entry preserves typed minutes; rounded-picker values would be :00)
        await wait(1000);
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const match = post.message.match(/local_manual:\s*(\S+)/);
        if (!match || !match[1]) {
            throw new Error(`Expected local_manual to have a value but got: ${post.message}`);
        }
        const submitted = match[1];
        if (!/T\d{2}:30:00\.000Z$/.test(submitted)) {
            throw new Error(`Expected manually-entered minutes (:30) in local_manual but got: ${submitted}`);
        }
    });
});
