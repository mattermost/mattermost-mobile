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
import {wait, isAndroid, safeEnableSynchronization, timeouts, waitForElementToBeVisible} from '@support/utils';

async function postSlashCommandDirect(command: string) {
    await ChannelScreen.postInput.tap();
    await ChannelScreen.postInput.replaceText(command);
    await ChannelScreen.sendButton.tap();
    await waitFor(InteractiveDialogScreen.interactiveDialogScreen).toExist().withTimeout(timeouts.FIVE_SEC);
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

const DIALOG_PLUGIN_CONFIG = {
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
};

const isDialogOnlyModeConfigured = async (): Promise<boolean> => {
    const {config} = await System.apiGetConfig(siteOneUrl);
    const pluginSettings = config?.PluginSettings;
    return pluginSettings?.PluginStates?.[DemoPlugin.id]?.Enable === true &&
        pluginSettings?.Plugins?.[DemoPlugin.id]?.DialogOnlyMode === true;
};

// Provisioning already applies this config, and re-sending it re-enters the server's
// plugin-activation path, which outran the client's 45s timeout. Patch only when the state is
// actually wrong, and gate on the read-back — a save that times out in transit often landed.
const ensureDialogOnlyMode = async () => {
    if (await isDialogOnlyModeConfigured()) {
        return;
    }

    const {error} = await System.apiUpdateConfig(siteOneUrl, DIALOG_PLUGIN_CONFIG);
    for (let attempt = 0; attempt < 15; attempt++) {
        if (await isDialogOnlyModeConfigured()) {
            return;
        }
        await wait(timeouts.TWO_SEC);
    }

    throw new Error(`Failed to configure demo plugin for dialog tests: ${error ? (error.message || JSON.stringify(error)) : 'config never reported DialogOnlyMode'}`);
};

describe('Interactive Dialog - Collapsible Sections (Plugin)', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testUser: any;
    let setupFailed = false;

    const setUpSuite = async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

        await User.apiAdminLogin(siteOneUrl);
        await ensureDialogOnlyMode();
        await System.apiUpdateConfig(siteOneUrl, {
            ServiceSettings: {
                EnableGifPicker: true,
                EnableMobileFileUpload: true,
            },
            FileSettings: {
                EnablePublicLink: true,
                EnableFileAttachments: true,
            },
            FeatureFlags: {InteractiveDialogAppsForm: true},
        });

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
    };

    beforeAll(async () => {
        try {
            await setUpSuite();
        } catch (error) {
            setupFailed = true;
            throw error;
        }
    });

    afterAll(async () => {
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
    });

    afterEach(async () => {
        if (setupFailed) {
            return;
        }
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
    });

    // Driven by the demo plugin's `/dialog collapsible` sample, which nests fields 1, 2,
    // and 3 levels deep. Level 1 starts expanded; levels 2 and 3 start collapsed. A field
    // inside a collapsed section is unmounted, so its input's existence proxies open state.
    // NOTE: MM-T56xx are placeholders pending the real Zephyr IDs.
    it('MM-T5601 should show expanded section fields and hide collapsed ones (Plugin)', async () => {
        await ensureDialogClosed();
        await postSlashCommandDirect('/dialog collapsible');
        await ensureDialogOpen();

        // * Level 1 starts expanded, so its fields are present
        await InteractiveDialogScreen.expectFieldVisible('first_name', true);
        await InteractiveDialogScreen.expectFieldVisible('last_name', true);

        // * Levels 2 and 3 start collapsed, so their fields are not mounted
        await InteractiveDialogScreen.expectFieldVisible('company', false);
        await InteractiveDialogScreen.expectFieldVisible('project_name', false);

        await InteractiveDialogScreen.cancel();
        await ensureDialogClosed();
    });

    it('MM-T5602 should reveal nested fields when expanding sections (Plugin)', async () => {
        await ensureDialogClosed();
        await postSlashCommandDirect('/dialog collapsible');
        await ensureDialogOpen();

        // # Expand level 2; its inner section is expanded by default
        await InteractiveDialogScreen.toggleSection('level2_section');

        // * Level 2 field and its already-expanded inner-section fields appear
        await InteractiveDialogScreen.expectFieldVisible('company', true);
        await InteractiveDialogScreen.expectFieldVisible('email', true);
        await InteractiveDialogScreen.expectFieldVisible('phone', true);

        // # Expand level 3; its inner section stays collapsed until tapped
        await InteractiveDialogScreen.toggleSection('level3_section');
        await InteractiveDialogScreen.expectFieldVisible('project_name', true);
        await InteractiveDialogScreen.expectFieldVisible('environment', false);

        // # Expand the innermost section to reveal its field
        await InteractiveDialogScreen.toggleSection('level3_inner_section');
        await InteractiveDialogScreen.expectFieldVisible('environment', true);

        await InteractiveDialogScreen.cancel();
        await ensureDialogClosed();
    });

    it('MM-T5603 should fill fields across sections and submit (Plugin)', async () => {
        await ensureDialogClosed();
        await postSlashCommandDirect('/dialog collapsible');
        await ensureDialogOpen();

        // # Fill the required level-1 fields, then expand level 2 for its required email.
        // first_name, last_name, and email are all required; the submit is blocked until
        // every one is filled, so a missing field yields no post at all.
        await InteractiveDialogScreen.fillTextElement('first_name', 'Ada');
        await InteractiveDialogScreen.fillTextElement('last_name', 'Lovelace');
        await InteractiveDialogScreen.toggleSection('level2_section');

        // Let the section finish expanding before typing; on iOS, filling while it still
        // animates drops the input and the submit silently no-ops.
        await wait(timeouts.ONE_SEC);
        await InteractiveDialogScreen.fillTextElement('email', 'ada@example.com');

        // # Submit and verify via the server post (a post only appears once every required
        // field is accepted), not the rendered UI, which flakes on the just-created post.
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        if (!post?.message?.includes('Dialog Submitted:')) {
            throw new Error(`Expected a "Dialog Submitted:" post, got: ${post?.message}`);
        }
    });
});
