// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-await-in-loop, no-empty */

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

// Concurrent interactive dialogs opened via the `action_button` element type.
//
// This lives in its own spec rather than in interactive_dialog_plugin.e2e.ts for
// three reasons, each of which caused cross-test interference when the cases were
// colocated:
//
//  1. `PluginSettings.Plugins[<id>]` is REPLACED, not merged, by apiUpdateConfig.
//     The basic-dialog suite sets only `DialogOnlyMode`; this suite also needs
//     `IntegrationRequestDelay`. Whichever beforeAll ran last clobbered the other.
//     Both keys are therefore always written together here (see setPluginConfig).
//  2. The basic-dialog afterEach closes exactly ONE dialog level. A 3-deep stack
//     left two dialogs open, and the next test then silently hit
//     MAX_OPEN_DIALOGS (3) — IntegrationsManager.tryShowDialog only logDebug's
//     when it drops a dialog, so the failure looked like an unrelated timeout.
//     drainDialogStack() below unwinds the whole stack instead.
//  3. That suite's afterAll calls HomeScreen.logout(), which would leave a second
//     describe in the same file running against a logged-out app.
//
// The client-side 3-dialog cap itself is covered by
// app/managers/integrations_manager.test.ts and is deliberately not asserted here.

import {
    Command,
    DemoPlugin,
    Plugin,
    Setup,
    System,
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
    InteractiveDialogScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isAndroid, safeEnableSynchronization, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

// Stacked dialogs are separate expo-router screens pushed by
// IntegrationsManager.tryShowDialog, so they all share this testID and lower
// screens stay mounted underneath. Un-indexed matchers therefore throw
// "multiple elements matched" — always probe/index. (Mobile twin of the Cypress
// `#appsModal` gotcha.)
const DIALOG_SCREEN_ID = 'interactive_dialog.screen';
const CLOSE_BUTTON_ID = 'close.interactive_dialog.button';
const SUBMIT_BUTTON_ID = 'interactive_dialog.submit.button';

// A single dialog matches several nodes per matcher (testID propagation across the
// SafeAreaView and its inner/accessibility views), and up to 3 dialogs can stack, so
// probe generously. This is a search bound, NOT a stack-depth measurement.
const MAX_TEXT_MATCH_PROBE = 12;

// Titles come straight from the demo plugin's dialog definitions
// (mattermost-plugin-demo server/dialog_samples.go). Em dash is U+2014.
const BOARD_TITLE = 'Incident Response Board';
const TRIAGE_TITLE = 'INC-301 — Triage';
const NOTE_TITLE = 'INC-301 — Add Note';

// testID = `AppFormElement.${name}` (apps_form_field.tsx), and @components/button
// suffixes the spinner with `-loader` (components/button/index.tsx).
const BTN_TRIAGE_INC301 = 'AppFormElement.btn_INC-301';
const BTN_ADD_NOTE = 'AppFormElement.btn_add_note';
const BTN_ESCALATE_FAIL = 'AppFormElement.btn_escalate_fail';
const BTN_TRIAGE_LOADER = `${BTN_TRIAGE_INC301}-loader`;

const ACTION_FAILED_TEXT = 'Action failed';

// Option labels include the plugin's emoji prefixes.
const STATUS_RESOLVED = '✅ resolved';
const SEVERITY_LOW = '🟢 low';

// ===== Helper Functions =====

// Always write BOTH keys — the server replaces the whole per-plugin map.
async function setPluginConfig(overrides: {[key: string]: any} = {}) {
    const result = await System.apiUpdateConfig(siteOneUrl, {
        PluginSettings: {
            PluginStates: {
                [DemoPlugin.id]: {Enable: true},
            },
            Plugins: {
                [DemoPlugin.id]: {
                    DialogOnlyMode: true,

                    // Seconds (server/http_hooks.go withDelay).
                    IntegrationRequestDelay: 0,
                    ...overrides,
                },
            },
        },
    });

    if (result.error) {
        throw new Error(`Failed to configure demo plugin: ${result.error.message || JSON.stringify(result.error)}`);
    }
}

// Stack depth is asserted through dialog TITLES, never by counting elements that
// match `interactive_dialog.screen`. React Native propagates a testID to several
// native views (the SafeAreaView plus inner/accessibility elements), so a single open
// dialog already matches 4+ elements — counting them reports nonsense. Titles are
// unique per dialog in this flow, which makes them a reliable identity.
//
// "visible" = the top of the stack. "exists" = mounted, i.e. still on the stack
// underneath. That distinction is what proves a parent survived its child opening.

// Detox reports "No elements found ... AT INDEX(n)" once n is past the last match, so
// that error means we have run out of indices and can stop. Any other error (the node
// exists but is not visible, etc.) only rules out THIS index, so keep probing. Without
// this short-circuit every absent-text check paid all MAX_TEXT_MATCH_PROBE round trips,
// and each failed Detox expect serialises the whole view hierarchy into the log.
function isIndexExhausted(err: unknown): boolean {
    return /no elements? found/i.test(String(err));
}

/** True when any node with this text is currently on screen. */
async function isTextVisible(text: string): Promise<boolean> {
    for (let i = 0; i < MAX_TEXT_MATCH_PROBE; i++) {
        try {
            await expect(element(by.text(text)).atIndex(i)).toBeVisible();
            return true;
        } catch (err) {
            // A hidden stack level can shadow the visible one, so a non-exhaustion
            // error only rules out this index.
            if (isIndexExhausted(err)) {
                return false;
            }
        }
    }
    return false;
}

/** True when any node with this text is mounted, visible or not. */
async function isTextPresent(text: string): Promise<boolean> {
    for (let i = 0; i < MAX_TEXT_MATCH_PROBE; i++) {
        try {
            await expect(element(by.text(text)).atIndex(i)).toExist();
            return true;
        } catch (err) {
            if (isIndexExhausted(err)) {
                return false;
            }
        }
    }
    return false;
}

/** The given dialog is the one the user is looking at. */
async function expectTopDialog(title: string) {
    if (!(await isTextVisible(title))) {
        throw new Error(`Expected "${title}" to be the visible dialog, but it is not on screen`);
    }
}

/** The given dialog is still on the stack, underneath whatever is on top. */
async function expectDialogStillStacked(title: string) {
    if (!(await isTextPresent(title))) {
        throw new Error(`Expected "${title}" to still be mounted underneath, but it is gone`);
    }
}

async function expectNoDialog(title: string) {
    if (await isTextPresent(title)) {
        throw new Error(`Expected "${title}" not to be mounted, but it is`);
    }
}

// A string can match several mounted-but-hidden stack levels, so poll indices
// for the instance that is actually on screen.
async function waitForVisibleText(text: string, timeout: number = timeouts.HALF_MIN) {
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
        if (await isTextVisible(text)) {
            return;
        }
        await wait(timeouts.HALF_SEC);
    }

    throw new Error(`waitForVisibleText: "${text}" never became visible`);
}

// swipe(), not scroll(): `interactive_dialog.screen` is the SafeAreaView wrapping the
// form (apps_form_component.tsx:460), and the KeyboardAwareScrollView inside it has no
// testID. Calling .scroll() on the SafeAreaView throws "is not a ScrollView", which
// silently reached nothing below the fold. A swipe is a gesture and propagates to the
// inner scroll view.
async function scrollTopDialog() {
    for (let i = 0; i < MAX_TEXT_MATCH_PROBE; i++) {
        try {
            await element(by.id(DIALOG_SCREEN_ID)).atIndex(i).swipe('up', 'slow', 0.4);
            await wait(timeouts.HALF_SEC);
            return;
        } catch {
            // Index may be a hidden stack level or a non-scrollable inner view.
        }
    }
}

async function tapActionButton(testID: string) {
    const button = element(by.id(testID));
    try {
        await waitFor(button).toBeVisible().withTimeout(timeouts.TEN_SEC);
    } catch {
        // Element may be below the fold on smaller screens.
        await scrollTopDialog();
        await waitFor(button).toBeVisible().withTimeout(timeouts.TEN_SEC);
    }
    await button.tap();
}

// Close buttons of lower stack levels stay mounted, and one dialog contributes several
// matching nodes, so probe the whole range. Detox taps require visibility, so only the
// top dialog's button can actually be hit.
async function closeTopDialog() {
    for (let i = 0; i < MAX_TEXT_MATCH_PROBE; i++) {
        try {
            await element(by.id(CLOSE_BUTTON_ID)).atIndex(i).tap();
            await wait(timeouts.ONE_SEC);
            return;
        } catch {
            // Not visible at this index — keep looking.
        }
    }

    try {
        await element(by.id(CLOSE_BUTTON_ID)).tap();
        await wait(timeouts.ONE_SEC);
        return;
    } catch {}

    if (isAndroid()) {
        await device.pressBack();
        await wait(timeouts.ONE_SEC);
        return;
    }

    throw new Error('closeTopDialog: could not close the top dialog');
}

// InteractiveDialogScreen.submit() matches the submit button un-indexed, which
// throws "multiple elements matched" as soon as a second dialog is stacked.
// Detox taps require visibility, so probing indices lands on the top dialog.
async function submitTopDialog() {
    const tapSubmit = async () => {
        for (let i = 0; i < MAX_TEXT_MATCH_PROBE; i++) {
            try {
                await element(by.id(SUBMIT_BUTTON_ID)).atIndex(i).tap();
                return true;
            } catch {
                // Not visible at this index — keep looking.
            }
        }
        try {
            await element(by.id(SUBMIT_BUTTON_ID)).tap();
            return true;
        } catch {}
        return false;
    };

    if (await tapSubmit()) {
        await wait(timeouts.ONE_SEC);
        return;
    }

    // Keyboard from a textarea can cover the button — scroll it back into view.
    await scrollTopDialog();
    if (await tapSubmit()) {
        await wait(timeouts.ONE_SEC);
        return;
    }

    throw new Error('submitTopDialog: could not submit the top dialog');
}

// Unwind the WHOLE stack. Leaving levels open makes the next test hit
// MAX_OPEN_DIALOGS, which drops dialogs silently.
async function drainDialogStack() {
    const titles = [NOTE_TITLE, TRIAGE_TITLE, BOARD_TITLE];

    // At most 3 can be stacked (MAX_OPEN_DIALOGS), plus one spare attempt.
    for (let attempt = 0; attempt < 4; attempt++) {
        let anyPresent = false;
        for (const title of titles) {
            if (await isTextPresent(title)) {
                anyPresent = true;
                break;
            }
        }
        if (!anyPresent) {
            return;
        }
        try {
            await closeTopDialog();
        } catch {
            return;
        }
    }
}

async function openIncidentBoard() {
    await ChannelScreen.postSlashCommand('/dialog action-buttons');

    // Sync off so the push animation does not block the poll.
    await device.disableSynchronization();
    try {
        await waitForVisibleText(BOARD_TITLE);
    } finally {
        await safeEnableSynchronization();
    }
}

describe('Interactive Dialog - Concurrent action_button Dialogs (Plugin)', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

        await User.apiAdminLogin(siteOneUrl);
        await setPluginConfig();

        const statusCheck = await Plugin.apiGetPluginStatus(siteOneUrl, DemoPlugin.id);
        if (!statusCheck.isActive) {
            throw new Error(`Demo plugin (${DemoPlugin.id}) is not active. Run Detox server provisioning before this suite.`);
        }
        await Command.waitForSlashCommandTrigger(siteOneUrl, testChannel.team_id, 'dialog', {timeoutMs: 60000});

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await ChannelListScreen.toBeVisible();
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // Deliberately NO type-then-clear warm-up here. On iOS 26 that leaves the
        // keyboard rendered while nothing is focused, so the layout reserves no space
        // and the post draft + send button end up behind it. composePostDraft's
        // keyboard-dismiss tap targets the post list, which does not exist in a freshly
        // created channel, so the keyboard never comes down and every send fails the
        // 75% visibility threshold. Command.waitForSlashCommandTrigger above already
        // covers command registration, and postSlashCommand retries on its own.
    });

    afterAll(async () => {
        try {
            await HomeScreen.logout();
        } catch {}
    });

    afterEach(async () => {
        await drainDialogStack();

        // Defensively clear any delay a test set, so a mid-test failure cannot
        // slow every subsequent dialog request.
        try {
            await setPluginConfig();
        } catch {}

        try {
            await waitFor(ChannelScreen.postInput).toBeVisible().withTimeout(timeouts.TEN_SEC);
        } catch {
            await ChannelListScreen.toBeVisible();
            await ChannelScreen.open(channelsCategory, testChannel.name);
            await waitFor(ChannelScreen.postInput).toBeVisible().withTimeout(timeouts.TEN_SEC);
        }
        await wait(timeouts.HALF_SEC);
    });

    it('MM-T5001 should stack a child dialog and keep the parent mounted', async () => {
        // # Open the incident board
        await openIncidentBoard();

        // * Only the board is open
        await expectTopDialog(BOARD_TITLE);
        await expectNoDialog(TRIAGE_TITLE);

        // # Tap the action button for INC-301
        await tapActionButton(BTN_TRIAGE_INC301);

        // * Triage is now on top and the board is still mounted underneath
        await waitForVisibleText(TRIAGE_TITLE);
        await expectDialogStillStacked(BOARD_TITLE);

        // # Tap the action button on the triage dialog
        await tapActionButton(BTN_ADD_NOTE);

        // * Timeline note is on top, with both ancestors still stacked below
        await waitForVisibleText(NOTE_TITLE);
        await expectDialogStillStacked(TRIAGE_TITLE);
        await expectDialogStillStacked(BOARD_TITLE);
    });

    it('MM-T5002 should preserve parent field values while a child dialog is open', async () => {
        // # Open the board and drill into triage
        await openIncidentBoard();
        await tapActionButton(BTN_TRIAGE_INC301);
        await waitForVisibleText(TRIAGE_TITLE);

        // # Change both selects away from their defaults (INC-301 defaults to
        // # investigating / critical)
        await InteractiveDialogScreen.selectOption('status', STATUS_RESOLVED);
        await InteractiveDialogScreen.selectOption('severity', SEVERITY_LOW);

        // * The new values are shown on the triage form
        await waitForVisibleText(STATUS_RESOLVED);
        await waitForVisibleText(SEVERITY_LOW);

        // # Open the timeline note child, then close it
        await tapActionButton(BTN_ADD_NOTE);
        await waitForVisibleText(NOTE_TITLE);
        await closeTopDialog();

        // * Back on triage with both edits intact — a shared dialog slot would
        // * have been overwritten by the child's config
        await waitForVisibleText(TRIAGE_TITLE);
        await expectNoDialog(NOTE_TITLE);
        await expectDialogStillStacked(BOARD_TITLE);
        await waitForVisibleText(STATUS_RESOLVED);
        await waitForVisibleText(SEVERITY_LOW);
    });

    it('MM-T5003 should unwind the stack one dialog at a time', async () => {
        // # Build a 3-deep stack
        await openIncidentBoard();
        await tapActionButton(BTN_TRIAGE_INC301);
        await waitForVisibleText(TRIAGE_TITLE);
        await tapActionButton(BTN_ADD_NOTE);
        await waitForVisibleText(NOTE_TITLE);
        await expectDialogStillStacked(TRIAGE_TITLE);
        await expectDialogStillStacked(BOARD_TITLE);

        // # Close the timeline note
        await closeTopDialog();

        // * Lands on triage, not the channel, and the note is gone
        await waitForVisibleText(TRIAGE_TITLE);
        await expectNoDialog(NOTE_TITLE);

        // # Close triage
        await closeTopDialog();

        // * Lands on the board, and triage is gone
        await waitForVisibleText(BOARD_TITLE);
        await expectNoDialog(TRIAGE_TITLE);

        // # Close the board
        await closeTopDialog();

        // * Back in the channel, with nothing left on the stack
        await expectNoDialog(BOARD_TITLE);
        await waitFor(ChannelScreen.postInput).toBeVisible().withTimeout(timeouts.TEN_SEC);
    });

    it('MM-T5004 should keep the parent open after submitting a child dialog', async () => {
        // # Build a 3-deep stack
        await openIncidentBoard();
        await tapActionButton(BTN_TRIAGE_INC301);
        await waitForVisibleText(TRIAGE_TITLE);
        await tapActionButton(BTN_ADD_NOTE);
        await waitForVisibleText(NOTE_TITLE);

        // # Fill the note form (both fields are required) and submit
        await InteractiveDialogScreen.selectOption('note_type', 'Update');
        await InteractiveDialogScreen.fillTextElement('message', 'Detox concurrent dialog note');
        await submitTopDialog();

        // * The child closes but the triage parent survives its submission
        await waitForVisibleText(TRIAGE_TITLE);
        await expectNoDialog(NOTE_TITLE);
        await expectDialogStillStacked(BOARD_TITLE);
    });

    it('MM-T5005 should show a loader and ignore repeat taps while an action is in flight', async () => {
        // # Slow the plugin's action handler so the in-flight window is observable
        await setPluginConfig({IntegrationRequestDelay: 3});

        try {
            await openIncidentBoard();

            // Sync off, otherwise Detox waits for the request to settle and the
            // loading state is never observable.
            await device.disableSynchronization();
            try {
                // # Tap the action button, then tap it again while it is loading
                await tapActionButton(BTN_TRIAGE_INC301);

                // * A spinner appears alongside the label (Button renders
                // * {showLoader && loadingComponent} next to {label}, it does not replace it)
                await waitFor(element(by.id(BTN_TRIAGE_LOADER))).toBeVisible().withTimeout(timeouts.TEN_SEC);

                // # Repeat tap while the action is in flight.
                //
                // The tap is EXPECTED to be rejected: the Button is rendered with
                // disabled={loading}, and Detox refuses to tap a disabled element. That
                // rejection is itself the evidence the guard is in place, so record it
                // instead of swallowing it — a bare catch here made the test's headline
                // claim ("ignore repeat taps") pass even when no second tap ever landed.
                let repeatTapRejected = false;
                try {
                    await element(by.id(BTN_TRIAGE_INC301)).tap();
                } catch {
                    repeatTapRejected = true;
                }

                // * Either the tap was refused (button disabled) or it landed and was
                // * absorbed by usePreventDoubleTap. Both are acceptable; what is NOT
                // * acceptable is a second dialog, which the close-once check below proves.
                if (!repeatTapRejected) {
                    await waitFor(element(by.id(BTN_TRIAGE_LOADER))).toBeVisible().withTimeout(timeouts.FIVE_SEC);
                }
            } finally {
                await safeEnableSynchronization();
            }

            // * A child opened
            await waitForVisibleText(TRIAGE_TITLE);

            // * ...and exactly one. Two stacked children would share the same title, so
            // * titles alone cannot count them: close once and check where we land.
            // * One child -> the board. Two -> still a triage dialog.
            await closeTopDialog();
            await waitForVisibleText(BOARD_TITLE);
            await expectNoDialog(TRIAGE_TITLE);
        } finally {
            await setPluginConfig();
        }
    });

    // Unskip once the ExecuteDialogAction status-check fix is on master — nothing in this
    // test needs to change.
    it.skip('MM-T5006 should surface an error and open no child when the action fails', async () => {
        // # Open the board and tap the always-failing action button
        await openIncidentBoard();
        await tapActionButton(BTN_ESCALATE_FAIL);

        // * The button renders its inline error, the board stays put, and no child opened
        await waitForVisibleText(ACTION_FAILED_TEXT);
        await expectTopDialog(BOARD_TITLE);
        await expectNoDialog(TRIAGE_TITLE);
        await expectNoDialog(NOTE_TITLE);
    });
});
