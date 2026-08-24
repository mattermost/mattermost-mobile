// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-await-in-loop, no-empty */

import {
    Command,
    ensureDemoPluginForDialogTests,
    Setup,
    User,
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
import {
    isAndroid,
    safeEnableSynchronization,
    timeouts,
    wait,
    waitForElementToBeVisible,
    waitForElementToExist,
} from '@support/utils';
import {expect} from 'detox';

export const SERVER_ONE_DISPLAY_NAME = 'Server 1';
export const CHANNELS_CATEGORY = 'channels';
export const ISO_DATETIME_PATTERN = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})/;

type DialogUser = {id: string; username: string};
type DialogChannel = {id: string; name: string; display_name: string; team_id: string};

export async function waitForDialogSelectorButton(testId: string) {
    await wait(timeouts.HALF_SEC);
    await waitForElementToExist(element(by.id(testId)), timeouts.TEN_SEC);
}

// Selector rows differ per data source: user_list.user_item.<id>.<id>, channel_list.<id>,
// options by text. Tap the display_name id — by.text hits the search field instead.
export async function selectUser(user: DialogUser, {multiselect = false} = {}) {
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

export async function ensureDialogClosed() {
    try {
        await waitFor(InteractiveDialogScreen.interactiveDialogScreen).not.toExist().withTimeout(3000);
    } catch {
        try {
            await InteractiveDialogScreen.cancel();
            await waitFor(InteractiveDialogScreen.interactiveDialogScreen).not.toExist().withTimeout(3000);
        } catch {}
    }

    // Defocus post draft / retract keyboard so later visibility checks are not obscured.
    try {
        await element(by.id('channel.post_list.flat_list')).tapAtPoint({x: 200, y: 10});
        await wait(500);
    } catch {}

    // Reveal new posts that might be hidden behind the input.
    try {
        await element(by.id('channel.post_list.flat_list')).swipe('up', 'fast', 0.2);
        await wait(300);
    } catch {}

    // Defocus tap can open a thread — back out if the channel composer is gone.
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
        isAndroid() ? await element(by.text('OK')).tap() : await element(by.label('OK')).atIndex(1);
        await wait(300);
    } catch {}
}

export async function setupInteractiveDialogPluginSuite(): Promise<{
    testChannel: DialogChannel;
    testUser: DialogUser;
}> {
    const {channel, user} = await Setup.apiInit(siteOneUrl);
    const testChannel = channel as DialogChannel;
    const testUser = user as DialogUser;

    await User.apiAdminLogin(siteOneUrl);
    await ensureDemoPluginForDialogTests(siteOneUrl);
    await Command.waitForSlashCommandTrigger(siteOneUrl, testChannel.team_id, 'dialog', {timeoutMs: 60000});

    await ServerScreen.connectToServer(serverOneUrl, SERVER_ONE_DISPLAY_NAME);
    await LoginScreen.login(testUser);
    await ChannelListScreen.toBeVisible();
    await ChannelScreen.open(CHANNELS_CATEGORY, testChannel.name);

    // Warm slash-command / IntegrationsManager — first /dialog after login can fail before ready.
    try {
        await ChannelScreen.postInput.typeText('/');
        await wait(timeouts.TWO_SEC);
        await ChannelScreen.postInput.clearText();
    } catch { /* best-effort */ }

    return {testChannel, testUser};
}

export async function cleanupInteractiveDialogAfterEach(testChannel: {name: string}) {
    await dismissErrorAlert();

    // Close a stuck integration selector, then any open dialog.
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

    // Android Back after cancel can leave channel list; re-enter if composer is gone.
    try {
        await waitFor(ChannelScreen.postInput).toBeVisible().withTimeout(timeouts.TEN_SEC);
    } catch {
        await ChannelListScreen.toBeVisible();
        await ChannelScreen.open(CHANNELS_CATEGORY, testChannel.name);
        await waitFor(ChannelScreen.postInput).toBeVisible().withTimeout(timeouts.TEN_SEC);
    }
    await wait(500);
}

export async function logoutInteractiveDialogSuite() {
    try {
        await HomeScreen.logout();
    } catch {
        // best-effort logout so later specs on this shard start clean
    }
}
