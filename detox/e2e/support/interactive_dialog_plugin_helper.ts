// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-await-in-loop, no-empty */

import path from 'path';

import {
    Command,
    DemoPlugin,
    Plugin,
    Setup,
    System,
    User,
    Post,
} from '@support/server_api';
import {apiSubmitDemoPluginFileUploadDialog} from '@support/server_api/plugin';
import {assertServerBaseline} from '@support/server_baseline';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {AttachmentOptions} from '@support/ui/component';
import {
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    IntegrationSelectorScreen,
    InteractiveDialogScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {wait, isAndroid, safeEnableSynchronization, timeouts, waitForElementToBeVisible, waitForElementToExist} from '@support/utils';
import {expect} from 'detox';

export const FILE_UPLOAD_FIXTURE = path.resolve(__dirname, 'fixtures/sample.txt');
export const ISO_DATETIME_PATTERN = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})/;

// MM-66558: dialog fields use replaceText instead of typeText.

export async function dismissAttachmentOptions() {
    try {
        await waitFor(AttachmentOptions.photoLibrary).toExist().withTimeout(3000);
        await AttachmentOptions.photoLibrary.swipe('down', 'fast', 0.5);
        await waitFor(AttachmentOptions.photoLibrary).not.toExist().withTimeout(3000);
    } catch {}
}

export async function seedFileUploadDialogViaApi(
    user: any,
    testChannelId: string,
    testTeamId: string,
    fieldName = 'single_file',
) {

    const loginResult = await User.apiLogin(siteOneUrl, {
        username: user.username,
        password: user.newUser.password,
    });
    if (loginResult.error) {
        throw new Error(`Failed to login as test user for file upload seed: ${JSON.stringify(loginResult.error)}`);
    }

    const {fileId, error: uploadError} = await Post.apiUploadFileToChannel(siteOneUrl, testChannelId, FILE_UPLOAD_FIXTURE);
    if (uploadError || !fileId) {
        throw new Error(`Failed to upload fixture for file upload seed: ${JSON.stringify(uploadError)}`);
    }

    const submitResult = await apiSubmitDemoPluginFileUploadDialog(siteOneUrl, {
        userId: user.id,
        channelId: testChannelId,
        teamId: testTeamId,
        submission: {[fieldName]: fileId},
        fileIds: [fileId],
    });
    if (submitResult.error) {
        throw new Error(`Failed to seed file upload dialog via plugin: ${JSON.stringify(submitResult.error)}`);
    }

    await User.apiAdminLogin(siteOneUrl);

    return fileId;
}

// ===== Helper Functions =====
export async function waitForDialogSelectorButton(testId: string) {
    await wait(timeouts.HALF_SEC);
    await waitForElementToExist(element(by.id(testId)), timeouts.TEN_SEC);
}

export async function selectUser(user: {id: string; username: string}, {multiselect = false} = {}) {
    const userItemId = `integration_selector.user_list.user_item.${user.id}.${user.id}`;
    const displayNameId = `${userItemId}.display_name`;

    await IntegrationSelectorScreen.searchFor(user.username);
    try {
        await IntegrationSelectorScreen.searchInput.tapReturnKey();
    } catch {
        // Keyboard may already be dismissed.
    }
    await wait(timeouts.HALF_SEC);

    const displayName = element(by.id(displayNameId));
    const userItem = element(by.id(userItemId));
    await waitFor(displayName).toExist().withTimeout(timeouts.TEN_SEC);

    try {
        await displayName.tap({x: 1, y: 1});
    } catch {
        await userItem.tap({x: 10, y: 20});
    }
    await wait(timeouts.ONE_SEC);

    if (multiselect) {
        // Selected chip + Done stay on the selector; field is optional so submit alone is not proof.
        await waitFor(element(by.id('integration_selector.multiselect.submit.button'))).
            toExist().
            withTimeout(timeouts.FIVE_SEC);
        await expect(element(by.id('integration_selector.screen'))).toExist();
        await expect(userItem).toExist();
        return;
    }

    await waitFor(element(by.id('integration_selector.screen'))).
        not.toExist().
        withTimeout(timeouts.TEN_SEC);
}

export async function selectChannel(channel?: {id: string; display_name: string}, {multiselect = false} = {}) {
    const waitForSelectorClosed = async () => {
        await waitFor(element(by.id('integration_selector.screen'))).
            not.toExist().
            withTimeout(timeouts.TEN_SEC);
    };

    if (channel) {
        const rowContent = element(by.id(`integration_selector.channel_list.${channel.id}`));
        let rowTapped = false;
        try {
            await waitFor(rowContent).toExist().withTimeout(timeouts.FIVE_SEC);
            await rowContent.tap();
            rowTapped = true;
            await wait(timeouts.ONE_SEC);
            if (multiselect) {
                await waitFor(element(by.id('integration_selector.multiselect.submit.button'))).
                    toExist().
                    withTimeout(timeouts.FIVE_SEC);
                await expect(element(by.id('integration_selector.screen'))).toExist();
            } else {
                await waitForSelectorClosed();
            }
            return;
        } catch {
            if (rowTapped) {
                throw new Error('selectChannel: row tapped but selector state did not settle');
            }

            // Fall through only when the row itself was not tappable.
        }

        try {
            // Only use text fallback while the selector is still open.
            await expect(element(by.id('integration_selector.screen'))).toExist();
            await element(by.text(channel.display_name)).tap();
            await wait(timeouts.ONE_SEC);
            if (multiselect) {
                await waitFor(element(by.id('integration_selector.multiselect.submit.button'))).
                    toExist().
                    withTimeout(timeouts.FIVE_SEC);
                await expect(element(by.id('integration_selector.screen'))).toExist();
            } else {
                await waitForSelectorClosed();
            }
            return;
        } catch {
            // Fall through.
        }
    }

    try {
        await expect(element(by.id('integration_selector.screen'))).toExist();
        const sharedRow = element(by.id('integration_selector.channel_list')).atIndex(0);
        await expect(sharedRow).toExist();
        await sharedRow.tap();
        await wait(timeouts.ONE_SEC);
        if (multiselect) {
            await waitFor(element(by.id('integration_selector.multiselect.submit.button'))).
                toExist().
                withTimeout(timeouts.FIVE_SEC);
            await expect(element(by.id('integration_selector.screen'))).toExist();
        } else {
            await waitForSelectorClosed();
        }
        return;
    } catch {
        // Fall through to well-known channel names.
    }

    for (const name of ['Town Square', 'Off-Topic', 'General']) {
        try {
            await expect(element(by.id('integration_selector.screen'))).toExist();
            await element(by.text(name)).tap();
            await wait(timeouts.ONE_SEC);
            if (multiselect) {
                await waitFor(element(by.id('integration_selector.multiselect.submit.button'))).
                    toExist().
                    withTimeout(timeouts.FIVE_SEC);
                await expect(element(by.id('integration_selector.screen'))).toExist();
            } else {
                await waitForSelectorClosed();
            }
            return;
        } catch {
            // Try next name.
        }
    }

    throw new Error('selectChannel: could not select a channel row');
}

// Deliberately not ChannelScreen.postSlashCommand: after tapping send it waits on
// waitForElementToBeVisible(dialog, HALF_MIN) with Detox synchronization enabled, and the
// dialog's bottom-sheet animation keeps the app busy so that poll never resolves — it burns
// the full 30s on every call (measured 30.3s avg vs 5.9s here) and only succeeds via its
// retry path. ensureDialogOpen() below does the same check with sync disabled in ~0.1s.
export async function postSlashCommandDirect(command: string) {
    await ChannelScreen.postInput.tap();
    await ChannelScreen.postInput.replaceText(command);
    await ChannelScreen.sendButton.tap();
    await waitFor(InteractiveDialogScreen.interactiveDialogScreen).toExist().withTimeout(timeouts.FIVE_SEC);
}

export async function ensureDialogClosed() {
    try {
        await waitFor(InteractiveDialogScreen.interactiveDialogScreen).not.toExist().withTimeout(3000);
    } catch {
        try {
            await InteractiveDialogScreen.cancel();
            await waitFor(InteractiveDialogScreen.interactiveDialogScreen).not.toExist().withTimeout(3000);
        } catch {}
    }

    try {
        await element(by.id('channel.post_list.flat_list')).tapAtPoint({x: 200, y: 10});
        await wait(500);
    } catch {}

    // Swipe up on post list to reveal new posts that might be hidden behind input
    try {
        await element(by.id('channel.post_list.flat_list')).swipe('up', 'fast', 0.2);
        await wait(300);
    } catch {}

    try {
        await waitFor(element(by.id('channel.post_draft.post.input'))).toBeVisible().withTimeout(2000);
    } catch {
        try {
            await element(by.id('navigation.header.back')).tap();
            await wait(500);
        } catch {}
    }
}

export async function ensureDialogOpen() {
    // Disable sync so the bottom sheet animation does not block the poll.
    await device.disableSynchronization();
    try {
        await waitForElementToBeVisible(InteractiveDialogScreen.interactiveDialogScreen, timeouts.HALF_MIN);
    } finally {
        await safeEnableSynchronization();
    }
}

export async function dismissErrorAlert() {
    try {
        if (isAndroid()) {
            await element(by.text('OK')).tap();
        } else {
            await element(by.label('OK')).atIndex(1).tap();
        }
        await wait(300);
    } catch {}
}

const isDialogOnlyModeConfigured = async (): Promise<boolean> => {
    const {config} = await System.apiGetConfig(siteOneUrl);
    const pluginSettings = config?.PluginSettings;
    return pluginSettings?.PluginStates?.[DemoPlugin.id]?.Enable === true &&
        pluginSettings?.Plugins?.[DemoPlugin.id]?.DialogOnlyMode === true;
};

// Provisioning enables the demo plugin in DialogOnlyMode; re-sending it re-enters plugin activation for every shard.
const assertDialogOnlyMode = async () => {
    if (!await isDialogOnlyModeConfigured()) {
        throw new Error('Demo plugin is not enabled in DialogOnlyMode; provisioning must run first');
    }
};

/** Shared suite setup for the demo-plugin dialog specs. */
export async function setUpDialogSuite(channelsCategory: string) {
    const serverOneDisplayName = 'Server 1';
    const {channel, team, user} = await Setup.apiInit(siteOneUrl);
    const testChannel = channel;
    const testUser = user;

    await User.apiAdminLogin(siteOneUrl);

    // Provisioning owns these settings; the suite only checks them.
    await assertDialogOnlyMode();
    await assertServerBaseline(siteOneUrl, ['ServiceSettings.EnableGifPicker', 'FileSettings.EnablePublicLink', 'FileSettings.EnableFileAttachments', 'FileSettings.EnableMobileUpload']);

    const statusCheck = await Plugin.apiGetPluginStatus(siteOneUrl, DemoPlugin.id);
    if (!statusCheck.isActive) {
        throw new Error(`Demo plugin (${DemoPlugin.id}) is not active. Run Detox server provisioning before this suite.`);
    }
    await Command.waitForSlashCommandTrigger(siteOneUrl, testChannel.team_id, 'dialog', {timeoutMs: 60000});

    await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
    await LoginScreen.login(testUser);
    await ChannelListScreen.toBeVisible();
    {

        // The sidebar row can be covered by a UITransitionView while the channel
        // list is still animating in, which makes the tap fail with "View is not
        // hittable at its visible point". This runs in beforeAll, so a single
        // transient miss fails every test in the file — retry before giving up.
        let lastError: unknown;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                await ChannelScreen.open(channelsCategory, testChannel.name);
                lastError = undefined;
                break;
            } catch (error) {
                lastError = error;
                await wait(timeouts.TWO_SEC);
                try {
                    await ChannelListScreen.toBeVisible();
                } catch {}
            }
        }
        if (lastError) {
            throw lastError;
        }
    }

    // Warm slash-command / IntegrationsManager state — first /dialog after login
    // can return "Error Executing Command" before commands are ready (CI MM-T4101/4102).
    try {
        await ChannelScreen.postInput.typeText('/');
        await wait(timeouts.TWO_SEC);
        await ChannelScreen.postInput.clearText();
    } catch { /* best-effort */ }

    // The websocket entry() that runs after login finishes asynchronously, and on a
    // phone its first-load branch does setCurrentTeamAndChannelId(initialTeamId, '')
    // — clearing the channel and dropping the app back to the channel list. If that
    // lands after we opened the channel above, the first test starts on the wrong
    // screen and postInput does not exist. Let it settle, then re-enter if it drifted.
    // Best-effort only. This runs in beforeAll, so anything that throws here fails
    // every test in the file; afterEach re-establishes the channel for every test
    // after the first, so a miss costs one test, not the suite.
    try {
        await wait(timeouts.FOUR_SEC);
        try {
            await ChannelScreen.dismissKeyboard();
        } catch {}
        try {
            await waitFor(ChannelScreen.postInput).toBeVisible().withTimeout(timeouts.TWO_SEC);
        } catch {
            await ChannelListScreen.toBeVisible();
            await ChannelScreen.open(channelsCategory, testChannel.name);
            await waitFor(ChannelScreen.postInput).toBeVisible().withTimeout(timeouts.TEN_SEC);
        }
    } catch { /* leave recovery to afterEach */ }

    return {channel, team, user};
}

/** Best-effort logout at the end of a dialog suite. */
export async function logOutAfterDialogSuite() {
    try {
        // HomeScreen.logout -> AccountScreen.open chains several tooltip waits plus a
        // 10s account-tab wait and fallbacks. When the tab bar is not reachable (this
        // spec ends inside a channel) it burns ~45s and still fails, so gate it on the
        // tab bar actually being there and skip cheaply when it is not.
        await waitFor(HomeScreen.accountTab).toExist().withTimeout(timeouts.TWO_SEC);
        await HomeScreen.logout();
    } catch {
        // best-effort logout so later specs on this shard start clean
    }
}

/** Return to the channel composer after a dialog test, whatever state the test left. */
export async function cleanUpAfterDialogTest(channelsCategory: string, testChannel: {name: string}) {
    await dismissErrorAlert();

    // Only clean up the integration selector when it is actually on screen. Both
    // helpers start with their own waitFor — cancel() 2s, done() 10s — so calling
    // them unconditionally burned ~12s of pure timeout on every test in this
    // describe, where the selector is never opened.
    try {
        await waitFor(IntegrationSelectorScreen.integrationSelectorScreen).toExist().withTimeout(timeouts.HALF_SEC);
        try {
            await IntegrationSelectorScreen.cancel();
        } catch {}
        try {
            await IntegrationSelectorScreen.done();
        } catch {}
    } catch { /* selector not open — nothing to clean up */ }
    try {
        await waitFor(InteractiveDialogScreen.interactiveDialogScreen).toExist().withTimeout(timeouts.HALF_SEC);
        await InteractiveDialogScreen.cancel();
    } catch {}

    // postSlashCommandDirect taps the composer, which raises the keyboard and can leave
    // it up. A raised keyboard obscures the composer, so drop it before requiring it —
    // otherwise the spec only passes when a preceding test happened to dismiss it.
    try {
        await ChannelScreen.dismissKeyboard();
    } catch {}

    // Android Back from cancel() after the dialog is already closed leaves channel list;
    // require composer, and re-enter the channel if cleanup drifted.
    try {
        await waitFor(ChannelScreen.postInput).toBeVisible().withTimeout(timeouts.TEN_SEC);
    } catch {
        await ChannelListScreen.toBeVisible();
        await ChannelScreen.open(channelsCategory, testChannel.name);
        try {
            await ChannelScreen.dismissKeyboard();
        } catch {}
        await waitFor(ChannelScreen.postInput).toBeVisible().withTimeout(timeouts.TEN_SEC);
    }
    await wait(500);
}
