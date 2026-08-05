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
    DemoPlugin,
    Plugin,
    Setup,
    System,
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
import {wait, isAndroid, safeEnableSynchronization, timeouts, waitForElementToBeVisible, waitForElementToExist} from '@support/utils';
import {expect} from 'detox';

const ISO_DATETIME_PATTERN = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})/;

// MM-66558: dialog fields use replaceText instead of typeText.

// ===== Helper Functions =====
async function waitForDialogSelectorButton(testId: string) {
    await wait(timeouts.HALF_SEC);
    await waitForElementToExist(element(by.id(testId)), timeouts.TEN_SEC);
}

// Selector rows differ per data source: user_list.user_item.<id>.<id>, channel_list.<id>,
// options by text. Tap the display_name id — by.text hits the search field instead.
async function selectUser(user: {id: string; username: string}, {multiselect = false} = {}) {
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

async function selectChannel(channel?: {id: string; display_name: string}, {multiselect = false} = {}) {
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
        const configResult = await System.apiUpdateConfig(siteOneUrl, {
            PluginSettings: {
                PluginStates: {
                    [DemoPlugin.id]: {Enable: true},
                },
                Plugins: {
                    [DemoPlugin.id]: {
                        DialogOnlyMode: true,
                    },
                },
            },
        });
        if (configResult.error) {
            throw new Error(`Failed to configure demo plugin for dialog tests: ${configResult.error.message || JSON.stringify(configResult.error)}`);
        }

        const statusCheck = await Plugin.apiGetPluginStatus(siteOneUrl, DemoPlugin.id);
        if (!statusCheck.isActive) {
            throw new Error(`Demo plugin (${DemoPlugin.id}) is not active. Run Detox server provisioning before this suite.`);
        }
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

    it('MM-T4201 should fill and submit all text field types (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog textfields');
        await ensureDialogOpen();
        await InteractiveDialogScreen.fillTextElement('text_field', 'Regular text input');
        await InteractiveDialogScreen.fillTextElement('required_text', 'Required field value');
        await InteractiveDialogScreen.fillTextElement('email_field', 'test@example.com');
        await InteractiveDialogScreen.fillTextElement('number_field', '42');
        await InteractiveDialogScreen.fillTextElement('password_field', 'secret123');
        await InteractiveDialogScreen.fillTextElement('textarea_field', 'This is a multiline\ntext area input\nwith multiple lines');
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, 'Dialog Submitted:');
    });
});
