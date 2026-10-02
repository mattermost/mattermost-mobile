// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-await-in-loop, no-empty */

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

// checkbox_group / checkbox_matrix element types and the label_position option.
//
// Backed by two demo-plugin dialogs added for this suite: `/dialog checkbox-group`
// and `/dialog checkbox-matrix`. Both submit to the plugin's /dialog/checkboxes
// handler, which echoes the submission as readable message text — handleDialog1's
// Props-only pattern isn't assertable on screen, and the encoding (comma-joined
// group values vs `;`-joined `row:col1,col2` matrix entries) is exactly what needs
// checking. The plugin sorts values canonically, so assertions don't depend on the
// order cells were tapped.
//
// Kept out of interactive_dialog_plugin.e2e.ts: that suite is already over the
// 550-line lint budget, and its afterEach/afterAll (logout) don't compose with a
// second describe.

import {
    Command,
    DemoPlugin,
    Plugin,
    Post,
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
import {safeEnableSynchronization, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

const DIALOG_SCREEN_ID = 'interactive_dialog.screen';

// testID = `AppFormElement.${name}` (apps_form_field.tsx:130).
const F_SERVICES = 'AppFormElement.services';
const F_REGIONS = 'AppFormElement.regions';
const F_NOTIFY_BEFORE = 'AppFormElement.notify_before';
const F_NOTIFY_AFTER = 'AppFormElement.notify_after';
const F_PRIORITY = 'AppFormElement.priority';
const F_PERMISSIONS = 'AppFormElement.permissions';
const F_ENV_OWNER = 'AppFormElement.environment_owner';

// checkbox_group_setting/index.tsx:80 + checkbox_entry.tsx:120
const checkbox = (field: string, value: string) => `${field}.checkbox.${value}.button`;
const checkboxChecked = (field: string, value: string) => `${checkbox(field, value)}.checked`;

// checkbox_matrix_setting/index.tsx:309 + :164
const cell = (field: string, row: string, col: string) => `${field}.matrix.${row}.${col}.button`;
const cellChecked = (field: string, row: string, col: string) => `${cell(field, row, col)}.checked`;

// checkbox_matrix_setting/index.tsx:271 — id is the field name.
const MATRIX_SCROLL = `${F_PERMISSIONS}.matrix.permissions.scroll`;

// radio_setting/index.tsx:103 — only rendered when `optional && value`.
const PRIORITY_CLEAR = `${F_PRIORITY}.clear`;

// ===== Helper Functions =====

// A string can match more than one node (a row label also rendered elsewhere, an
// introduction_text that repeats the title, ...). An un-indexed by.text matcher
// fails outright with "multiple elements matched", so probe the low indices for
// the instance that is actually on screen.
const MAX_TEXT_MATCH_PROBE = 4;

async function waitForVisibleText(text: string, timeout: number = timeouts.HALF_MIN) {
    const deadline = Date.now() + timeout;
    let lastError: unknown;

    while (Date.now() < deadline) {
        for (let i = 0; i < MAX_TEXT_MATCH_PROBE; i++) {
            try {
                await expect(element(by.text(text)).atIndex(i)).toBeVisible();
                return;
            } catch (err) {
                lastError = err;
            }
        }
        await wait(timeouts.HALF_SEC);
    }

    throw new Error(`waitForVisibleText: "${text}" never became visible (${String(lastError)})`);
}

// Sync off so the modal push animation does not block the poll.
// waitForVisibleText (not a bare by.text) because the title can legitimately
// appear more than once — e.g. a dialog whose introduction_text repeats it —
// and an un-indexed matcher then fails with "multiple elements matched".
async function waitForDialog(expectedTitle: string) {
    await device.disableSynchronization();
    try {
        await waitForVisibleText(expectedTitle);
    } finally {
        await safeEnableSynchronization();
    }
}

/**
 * Types the command into the post draft.
 *
 * This has to go through the UI. Executing the command over the API instead does not
 * work: IntegrationsManager only calls showDialog() when the trigger_id from the
 * `open_dialog` WebSocket event matches one the app itself registered via
 * setTriggerId() (app/managers/integrations_manager.ts). A command run by any other
 * client yields a trigger_id the app never saw, so the dialog is stored and never
 * displayed. The app shows only dialogs it initiated.
 */
async function openDialog(command: string, expectedTitle: string) {
    await ChannelScreen.postSlashCommand(command);
    await waitForDialog(expectedTitle);
}

// Detox phrases a genuine absence differently depending on the matcher: an indexed one
// gives "No elements found ... AT INDEX(n)", an un-indexed one gives "Failed expectation:
// TOEXIST WITH MATCHER(...)". Those strings come from the native runner, so allow-listing
// them is fragile. Deny-list instead: swallow a failed toExist() as "absent", EXCEPT when
// the error says the matcher was ambiguous — that means the check could not answer the
// question and must not be silently read as "absent".
function isAmbiguousMatchError(err: unknown): boolean {
    return /multiple elements/i.test(String(err));
}

async function elementExists(testID: string): Promise<boolean> {
    try {
        await expect(element(by.id(testID))).toExist();
        return true;
    } catch (err) {
        if (isAmbiguousMatchError(err)) {
            throw new Error(`Ambiguous matcher for ${testID} — cannot tell if it exists: ${String(err)}`);
        }
        return false;
    }
}

async function dialogIsOpen(): Promise<boolean> {
    return elementExists(DIALOG_SCREEN_ID);
}

// Used from afterEach, so it must never throw: a cleanup failure would replace the real
// test failure with a confusing one and leave the next test starting on a stale dialog.
async function closeDialogIfOpen() {
    try {
        if (await dialogIsOpen()) {
            await InteractiveDialogScreen.cancel();
        }
    } catch {
        // Best-effort cleanup only.
    }
}

// Fields below the fold need the dialog scrolled before they are tappable.
// `.checked` assertions use toExist() instead and need no scrolling.
//
// swipe(), not scroll(): `interactive_dialog.screen` is the SafeAreaView wrapping
// the form (apps_form_component.tsx:468), and the KeyboardAwareScrollView inside it
// has no testID. Calling .scroll() on the SafeAreaView throws "is not a ScrollView",
// so nothing below the fold was ever reachable. A swipe is a gesture and propagates
// to the inner scroll view.
async function ensureFieldVisible(testID: string, maxSwipes = 8) {
    for (let i = 0; i <= maxSwipes; i++) {
        try {
            await waitFor(element(by.id(testID))).toBeVisible().withTimeout(timeouts.ONE_SEC);
            return;
        } catch {
            if (i === maxSwipes) {
                break;
            }
            try {
                await element(by.id(DIALOG_SCREEN_ID)).swipe('up', 'slow', 0.4);
                await wait(timeouts.HALF_SEC);
            } catch (swipeError) {
                throw new Error(`ensureFieldVisible: could not swipe the dialog to reach ${testID}: ${String(swipeError)}`);
            }
        }
    }
    throw new Error(`ensureFieldVisible: ${testID} never became visible after ${maxSwipes} swipes`);
}

async function tapField(testID: string) {
    await ensureFieldVisible(testID);
    await element(by.id(testID)).tap();

    // No fixed sleep: synchronization is enabled, so Detox already waits for the app
    // to go idle after the tap. Re-add a short wait only if taps start racing.
}

async function expectExists(testID: string) {
    if (!(await elementExists(testID))) {
        throw new Error(`Expected ${testID} to exist, but it does not`);
    }
}

async function expectNotExists(testID: string) {
    if (await elementExists(testID)) {
        throw new Error(`Expected ${testID} NOT to exist, but it does`);
    }
}

// Detox's `expect` shadows Jest's in this file, so assert plain values by throwing.
function assertMessageContains(message: string, expected: string) {
    if (!message.includes(expected)) {
        throw new Error(`Expected submitted post to contain "${expected}", got:\n${message}`);
    }
}

// The echo puts one `field=value` per line. Parsing it and comparing the WHOLE value
// matters: a substring check like message.includes('services=api,db') also matches an
// echo of 'services=api,db,web', so a regression that submits extra values would pass.
function parseEchoFields(message: string): Map<string, string> {
    const fields = new Map<string, string>();
    for (const line of message.split('\n')) {
        const eq = line.indexOf('=');
        if (eq > 0) {
            fields.set(line.slice(0, eq).trim(), line.slice(eq + 1).trim());
        }
    }
    return fields;
}

/** Asserts the submitted value for `field` is EXACTLY `expected` — no extras. */
function assertSubmittedField(message: string, field: string, expected: string) {
    const actual = parseEchoFields(message).get(field);
    if (actual === undefined) {
        throw new Error(`Submitted post has no "${field}" line. Full post:\n${message}`);
    }
    if (actual !== expected) {
        throw new Error(`Expected ${field}="${expected}" but got "${actual}". Full post:\n${message}`);
    }
}

async function newestPostId(channelId: string): Promise<string | undefined> {
    const {posts} = await Post.apiGetPostsInChannel(siteOneUrl, channelId);
    return posts?.[0]?.id;
}

async function submitAndReadEcho(channelId: string): Promise<string> {
    // Baseline the newest post BEFORE submitting. apiGetLastPostInChannel returns
    // whatever the latest post happens to be with no recency check, so without this a
    // slow bot CreatePost makes the assertion read the PREVIOUS test's echo — which
    // then fails while blaming this test's encoding. It also could not distinguish
    // "no post was created at all" from a correct submission.
    const baselineId = await newestPostId(channelId);

    await InteractiveDialogScreen.submit();
    await waitFor(element(by.id(DIALOG_SCREEN_ID))).not.toExist().withTimeout(timeouts.TEN_SEC);

    const deadline = Date.now() + timeouts.HALF_MIN;
    while (Date.now() < deadline) {
        const {posts} = await Post.apiGetPostsInChannel(siteOneUrl, channelId);
        const post = posts?.[0];
        if (post?.id && post.id !== baselineId) {
            const message: string = post.message || '';
            assertMessageContains(message, 'Checkboxes Submitted:');
            return message;
        }
        await wait(timeouts.HALF_SEC);
    }

    throw new Error('No new post appeared in the channel after submitting the dialog');
}

// Reads an element's horizontal position. Used to prove label_position actually
// reorders the control relative to its label — Detox cannot assert sibling order.
// iOS exposes `frame`, Android `visibleBounds`; multi-matches come back nested
// under `elements`.
async function elementX(testID: string): Promise<number> {
    const attrs: any = await element(by.id(testID)).getAttributes();
    const a = attrs?.elements ? attrs.elements[0] : attrs;
    const x = a?.frame?.x ?? a?.visibleBounds?.left ?? a?.x;
    if (typeof x !== 'number') {
        throw new Error(`elementX: could not read an x coordinate for ${testID} from ${JSON.stringify(attrs)}`);
    }
    return x;
}

describe('Interactive Dialog - Checkbox Group & Matrix (Plugin)', () => {
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
            throw new Error(`Failed to configure demo plugin: ${configResult.error.message || JSON.stringify(configResult.error)}`);
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

        // Deliberately NO type-then-clear warm-up here. On iOS 26 that leaves the
        // keyboard rendered while nothing is focused, so the layout reserves no space
        // and the post draft + send button end up behind it. composePostDraft's
        // keyboard-dismiss tap targets the post list, which does not exist in a
        // freshly created channel, so the keyboard never comes down and every send
        // fails the 75% visibility threshold. Command.waitForSlashCommandTrigger above
        // already covers command registration, and postSlashCommand retries on its own.
    });

    afterAll(async () => {
        try {
            await HomeScreen.logout();
        } catch {}
    });

    afterEach(async () => {
        await closeDialogIfOpen();

        try {
            await waitFor(ChannelScreen.postInput).toBeVisible().withTimeout(timeouts.TEN_SEC);
        } catch {
            await ChannelListScreen.toBeVisible();
            await ChannelScreen.open(channelsCategory, testChannel.name);
            await waitFor(ChannelScreen.postInput).toBeVisible().withTimeout(timeouts.TEN_SEC);
        }
        await wait(timeouts.HALF_SEC);
    });

    it('MM-T5115 should toggle checkbox_group boxes and submit comma-joined values', async () => {
        // # Open the checkbox group dialog
        await openDialog('/dialog checkbox-group', 'Checkbox Group Demo');

        // # Check two services (required field, starts empty)
        await tapField(checkbox(F_SERVICES, 'api'));
        await tapField(checkbox(F_SERVICES, 'db'));

        // * Both render a check mark, the untouched one does not
        await expectExists(checkboxChecked(F_SERVICES, 'api'));
        await expectExists(checkboxChecked(F_SERVICES, 'db'));
        await expectNotExists(checkboxChecked(F_SERVICES, 'web'));

        // # Uncheck one of the defaulted regions
        await tapField(checkbox(F_REGIONS, 'apac'));
        await expectNotExists(checkboxChecked(F_REGIONS, 'apac'));

        // * Submission carries comma-joined values for both fields
        const message = await submitAndReadEcho(testChannel.id);
        assertSubmittedField(message, 'services', 'api,db');
        assertSubmittedField(message, 'regions', 'us');
    });

    it('MM-T5116 should pre-check checkbox_group values from the default', async () => {
        // # Open the dialog without touching anything
        await openDialog('/dialog checkbox-group', 'Checkbox Group Demo');

        // * `regions` default is "us,apac" — those two are checked, eu is not
        await expectExists(checkboxChecked(F_REGIONS, 'us'));
        await expectExists(checkboxChecked(F_REGIONS, 'apac'));
        await expectNotExists(checkboxChecked(F_REGIONS, 'eu'));

        // * `services` has no default, so nothing is checked
        await expectNotExists(checkboxChecked(F_SERVICES, 'api'));
        await expectNotExists(checkboxChecked(F_SERVICES, 'web'));
        await expectNotExists(checkboxChecked(F_SERVICES, 'db'));
        await expectNotExists(checkboxChecked(F_SERVICES, 'cache'));
    });

    it('MM-T5117 should block submit while a required checkbox_group is empty', async () => {
        // # Open the dialog and submit with `services` untouched
        await openDialog('/dialog checkbox-group', 'Checkbox Group Demo');
        await InteractiveDialogScreen.submit();
        await wait(timeouts.ONE_SEC);

        // * Validation keeps the dialog open
        if (!(await dialogIsOpen())) {
            throw new Error('Dialog closed even though the required checkbox_group was empty');
        }

        // # Satisfy the requirement and submit again
        await tapField(checkbox(F_SERVICES, 'cache'));
        const message = await submitAndReadEcho(testChannel.id);

        // * Now it goes through
        assertSubmittedField(message, 'services', 'cache');
    });

    it('MM-T5118 should place the checkbox after the label when label_position is after', async () => {
        // # Open the dialog and check the "before" variant, reading its position while
        // # that row is still on screen (the two fields cannot both be visible at once
        // # on a phone, and x is unaffected by later vertical scrolling).
        await openDialog('/dialog checkbox-group', 'Checkbox Group Demo');
        await tapField(checkbox(F_NOTIFY_BEFORE, 'email'));
        await expectExists(checkboxChecked(F_NOTIFY_BEFORE, 'email'));
        const beforeX = await elementX(checkboxChecked(F_NOTIFY_BEFORE, 'email'));

        // # Now the "after" variant
        await tapField(checkbox(F_NOTIFY_AFTER, 'email'));
        await expectExists(checkboxChecked(F_NOTIFY_AFTER, 'email'));
        const afterX = await elementX(checkboxChecked(F_NOTIFY_AFTER, 'email'));

        // * label_position "after" puts the control first (left of) the label,
        // * whereas the default/"before" layout puts the label first.
        if (!(afterX < beforeX)) {
            throw new Error(`Expected label_position "after" to place the checkbox left of the "before" variant, got after=${afterX} before=${beforeX}`);
        }
    });

    it('MM-T5119 should show Clear selection only once an optional radio has a value', async () => {
        // # Open the dialog
        await openDialog('/dialog checkbox-group', 'Checkbox Group Demo');

        // * No value yet, so no Clear control
        await expectNotExists(PRIORITY_CLEAR);

        // # Pick a priority
        await tapField(`${F_PRIORITY}.radio.p2.button`);

        // * Clear appears (its only render condition is `optional && value`)
        await expectExists(PRIORITY_CLEAR);

        // # Clear the selection
        await tapField(PRIORITY_CLEAR);

        // * Clear disappears again, proving the value was reset
        await expectNotExists(PRIORITY_CLEAR);
    });

    it('MM-T5120 should toggle matrix cells and submit row:col entries', async () => {
        // # Open the matrix dialog
        await openDialog('/dialog checkbox-matrix', 'Checkbox Matrix Demo');

        // * `permissions` default "posts:view,edit" is pre-checked
        await expectExists(cellChecked(F_PERMISSIONS, 'posts', 'view'));
        await expectExists(cellChecked(F_PERMISSIONS, 'posts', 'edit'));
        await expectNotExists(cellChecked(F_PERMISSIONS, 'files', 'view'));

        // # Add a cell on another row and remove one from the defaulted row
        await tapField(cell(F_PERMISSIONS, 'files', 'delete'));
        await tapField(cell(F_PERMISSIONS, 'posts', 'view'));

        await expectExists(cellChecked(F_PERMISSIONS, 'files', 'delete'));
        await expectNotExists(cellChecked(F_PERMISSIONS, 'posts', 'view'));

        // * Rows are `;`-joined and columns `,`-joined within a row
        const message = await submitAndReadEcho(testChannel.id);
        assertSubmittedField(message, 'permissions', 'files:delete;posts:edit');
    });

    // Asserted through the submitted encoding rather than per-cell checkmarks:
    // MatrixCell's `isRadio` branch renders a radio ring/dot with NO testID (only the
    // checkbox branch emits `${testID}.checked`), so a row_selection: single cell has
    // no assertable checked state. The final encoding is the stronger claim anyway —
    // `dev:bob` alone proves picking bob REPLACED alice rather than adding to her.
    it('MM-T5121 should allow only one column per row when row_selection is single', async () => {
        // # Open the matrix dialog and pick an owner for a row
        await openDialog('/dialog checkbox-matrix', 'Checkbox Matrix Demo');
        await tapField(cell(F_ENV_OWNER, 'dev', 'alice'));

        // # Pick a different owner in the SAME row
        await tapField(cell(F_ENV_OWNER, 'dev', 'bob'));

        // # And an owner in a different row, which must be independent
        await tapField(cell(F_ENV_OWNER, 'prod', 'carol'));

        // * dev resolves to bob only (alice replaced), prod keeps carol
        const message = await submitAndReadEcho(testChannel.id);
        assertSubmittedField(message, 'environment_owner', 'dev:bob;prod:carol');
    });

    it('MM-T5122 should keep row labels pinned while the matrix scrolls horizontally', async () => {
        // # Open the matrix dialog (`permissions` has 7 columns)
        await openDialog('/dialog checkbox-matrix', 'Checkbox Matrix Demo');
        await ensureFieldVisible(cell(F_PERMISSIONS, 'posts', 'view'));

        // * Row labels live outside the horizontal scroll view
        await waitForVisibleText('Posts', timeouts.TEN_SEC);

        // # Scroll the grid to the far right
        await element(by.id(MATRIX_SCROLL)).scroll(400, 'right');
        await wait(timeouts.HALF_SEC);

        // * A trailing column becomes reachable...
        await waitFor(element(by.id(cell(F_PERMISSIONS, 'posts', 'restore')))).
            toBeVisible().
            withTimeout(timeouts.TEN_SEC);

        // * ...and the frozen row-label column is still on screen
        await waitForVisibleText('Posts', timeouts.TEN_SEC);
    });
});
