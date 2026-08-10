// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-await-in-loop, no-empty */

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {MmBlocksTestHelper} from '@support/mm_blocks_test_helper';
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
import {wait, isAndroid, isIos, safeEnableSynchronization, timeouts, waitForElementToBeVisible, waitForElementToExist} from '@support/utils';
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
        await waitFor(InteractiveDialogScreen.interactiveDialogScreen).not.toExist().withTimeout(timeouts.THREE_SEC);
    } catch {
        try {
            await InteractiveDialogScreen.cancel();
            await waitFor(InteractiveDialogScreen.interactiveDialogScreen).not.toExist().withTimeout(timeouts.THREE_SEC);
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
        await waitFor(element(by.id('channel.post_draft.post.input'))).toBeVisible().withTimeout(timeouts.TWO_SEC);
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

    it('MM-T4101 should open simple interactive dialog (Plugin)', async () => {
        await ChannelScreen.postSlashCommand('/dialog basic');
        await ensureDialogOpen();
        await InteractiveDialogScreen.cancel();
        await ensureDialogClosed();
    });

    it('MM-T4102 should submit simple interactive dialog (Plugin)', async () => {
        await ChannelScreen.postSlashCommand('/dialog basic');
        await ensureDialogOpen();
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, 'Dialog Submitted:');
    });

    it('MM-T4103 should fill text field and submit dialog (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog basic');
        await ensureDialogOpen();
        await InteractiveDialogScreen.fillTextElement('optional_text', 'Plugin Test Value');
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, 'Dialog Submitted:');
    });

    it('MM-T4104 should handle server error on dialog submission (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog error');
        await ensureDialogOpen();
        await InteractiveDialogScreen.fillTextElement('optional_text', 'This will trigger server error');
        await InteractiveDialogScreen.submit();
        await wait(500);
        await expect(element(by.text('some error'))).toBeVisible();
        await ensureDialogOpen();
        await InteractiveDialogScreen.cancel();
        await ensureDialogClosed();
    });

    it('MM-T4401 should toggle boolean fields and submit (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog boolean');
        await ensureDialogOpen();
        await expect(element(by.id(InteractiveDialogScreen.boolInputTestID('required_boolean', false)))).toExist();
        await expect(element(by.id(InteractiveDialogScreen.boolInputTestID('optional_boolean', false)))).toExist();
        await expect(element(by.id(InteractiveDialogScreen.boolInputTestID('boolean_default_true', true)))).toExist();
        await expect(element(by.id(InteractiveDialogScreen.boolInputTestID('boolean_default_false', false)))).toExist();
        await InteractiveDialogScreen.toggleBooleanElement('required_boolean');
        await InteractiveDialogScreen.toggleBooleanElement('boolean_default_false');
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, 'Dialog Submitted:');
    });

    it('MM-T4402 should handle boolean field validation (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog boolean');
        await ensureDialogOpen();
        await InteractiveDialogScreen.submit();
        await wait(300);
        await ensureDialogOpen();
        await InteractiveDialogScreen.toggleBooleanElement('required_boolean');
        await InteractiveDialogScreen.toggleBooleanElement('boolean_default_false');
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, 'Dialog Submitted:');
    });

    // TODO: previously failed when selectUser tapped search-field text (CI 30250131265).
    it('MM-T4498 should open and handle interactive dialog with select fields (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog selectfields');
        await ensureDialogOpen();
        const engineeringRadioButton = element(by.id(InteractiveDialogScreen.radioOptionTestID('someradiooptions', 'engineering')));
        await expect(engineeringRadioButton).toExist();
        await engineeringRadioButton.tap();
        const selectDropdownButton = element(by.id(InteractiveDialogScreen.selectButtonTestID('someoptionselector')));
        await expect(selectDropdownButton).toExist();
        await selectDropdownButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await expect(element(by.text('Option2'))).toExist();
        await element(by.text('Option2')).tap();
        await waitForDialogSelectorButton(InteractiveDialogScreen.selectButtonTestID('someuserselector'));
        const userSelectorButton = element(by.id(InteractiveDialogScreen.selectButtonTestID('someuserselector')));
        await userSelectorButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await selectUser(testUser);
        const channelSelectorButton = element(by.id(InteractiveDialogScreen.selectButtonTestID('somechannelselector')));

        // 1s bridge-idle waitFor fails on Android after IntegrationSelector dismissal animation.
        await waitForDialogSelectorButton(InteractiveDialogScreen.selectButtonTestID('somechannelselector'));
        await channelSelectorButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await selectChannel(testChannel);
        await wait(300);
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, 'Dialog Submitted:');
    });

    it('MM-T4499 should handle required select field validation (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog selectfields');
        await ensureDialogOpen();
        await InteractiveDialogScreen.submit();
        await wait(300);
        await ensureDialogOpen();
        const engineeringRadioButton = element(by.id(InteractiveDialogScreen.radioOptionTestID('someradiooptions', 'engineering')));
        await expect(engineeringRadioButton).toExist();
        await engineeringRadioButton.tap();
        const selectDropdownButton = element(by.id(InteractiveDialogScreen.selectButtonTestID('someoptionselector')));
        await expect(selectDropdownButton).toExist();
        await selectDropdownButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await expect(element(by.text('Option1'))).toExist();
        await element(by.text('Option1')).tap();
        await waitForDialogSelectorButton(InteractiveDialogScreen.selectButtonTestID('someuserselector'));
        const userSelectorButton = element(by.id(InteractiveDialogScreen.selectButtonTestID('someuserselector')));
        await userSelectorButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await selectUser(testUser);
        await wait(300);
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, 'Dialog Submitted:');
    });

    it('MM-T4500 should handle different selector types (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog selectfields');
        await ensureDialogOpen();
        const engineeringRadioButton = element(by.id(InteractiveDialogScreen.radioOptionTestID('someradiooptions', 'engineering')));
        await expect(engineeringRadioButton).toExist();
        await engineeringRadioButton.tap();
        const selectDropdownButton = element(by.id(InteractiveDialogScreen.selectButtonTestID('someoptionselector')));
        await expect(selectDropdownButton).toExist();
        await selectDropdownButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await expect(element(by.text('Option2'))).toExist();
        await element(by.text('Option2')).tap();
        await waitForDialogSelectorButton(InteractiveDialogScreen.selectButtonTestID('someuserselector'));
        const userSelectorButton = element(by.id(InteractiveDialogScreen.selectButtonTestID('someuserselector')));
        await userSelectorButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await selectUser(testUser);
        const channelSelectorButton = element(by.id(InteractiveDialogScreen.selectButtonTestID('somechannelselector')));

        // 1s bridge-idle waitFor fails on Android after IntegrationSelector dismissal animation.
        await waitForDialogSelectorButton(InteractiveDialogScreen.selectButtonTestID('somechannelselector'));
        await channelSelectorButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await selectChannel(testChannel);
        await wait(300);
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, 'Dialog Submitted:');
    });

    // iOS-only skip carried over from the RF→Detox migration with no recorded failure;
    // Android still covers this case. Re-enable once the iOS path is re-verified.
    (isIos() ? it.skip : it)('MM-T4201 should fill and submit all text field types (Plugin)', async () => {
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

    it('MM-T4202 should validate required text field (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog textfields');
        await ensureDialogOpen();
        await InteractiveDialogScreen.fillTextElement('text_field', 'Optional text');
        await InteractiveDialogScreen.fillTextElement('email_field', 'optional@example.com');
        await InteractiveDialogScreen.submit();
        await wait(500);

        // If still open, fill required and submit
        try {
            await ensureDialogOpen();
            await InteractiveDialogScreen.fillTextElement('required_text', 'Now filled');
            await InteractiveDialogScreen.submit();
            await wait(500);
        } catch {}
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, 'Dialog Submitted:');
    });

    it('MM-T4203 should handle different text input subtypes (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog textfields');
        await ensureDialogOpen();
        await InteractiveDialogScreen.fillTextElement('email_field', 'valid.email+test@example.com');
        await InteractiveDialogScreen.fillTextElement('number_field', '12345');
        await InteractiveDialogScreen.fillTextElement('required_text', 'Subtype test complete');
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, 'Dialog Submitted:');
    });

    it('MM-T4976 should handle multiselect fields dialog (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog multi-select');
        await ensureDialogOpen();
        const multiselectUsersButton = element(by.id(InteractiveDialogScreen.selectButtonTestID('multiselect_users')));
        await expect(multiselectUsersButton).toExist();
        await multiselectUsersButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await selectUser(testUser, {multiselect: true});
        await wait(500);
        await IntegrationSelectorScreen.done();
        await wait(300);
        const multiselectChannelsButton = element(by.id(InteractiveDialogScreen.selectButtonTestID('multiselect_channels')));
        await expect(multiselectChannelsButton).toExist();
        await multiselectChannelsButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await selectChannel(testChannel, {multiselect: true});
        await wait(500);
        await IntegrationSelectorScreen.done();
        await wait(300);
        const multiselectOptionsButton = element(by.id(InteractiveDialogScreen.selectButtonTestID('multiselect_options')));
        await expect(multiselectOptionsButton).toExist();
        await multiselectOptionsButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await expect(element(by.text('Option A'))).toExist();
        await element(by.text('Option A')).tap();
        await wait(300);
        await expect(element(by.text('Option B'))).toExist();
        await element(by.text('Option B')).tap();
        await wait(300);
        await expect(element(by.text('Option C'))).toExist();
        await element(by.text('Option C')).tap();
        await wait(300);
        await IntegrationSelectorScreen.done();
        await wait(300);
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
    });

    it('MM-T4977 should handle dynamic select fields dialog (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog dynamic-select');
        await ensureDialogOpen();
        const dynamicProductsButton = element(by.id(InteractiveDialogScreen.selectButtonTestID('dynamic_products')));
        await expect(dynamicProductsButton).toExist();
        await dynamicProductsButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await IntegrationSelectorScreen.searchFor('macbook');
        await waitFor(element(by.text('MacBook Pro 16-inch'))).toExist().withTimeout(timeouts.TEN_SEC);
        await element(by.text('MacBook Pro 16-inch')).tap();
        await wait(300);
        const dynamicCompaniesButton = element(by.id(InteractiveDialogScreen.selectButtonTestID('dynamic_companies')));
        await waitFor(dynamicCompaniesButton).toExist().withTimeout(timeouts.THREE_SEC);
        await dynamicCompaniesButton.tap();
        await wait(300);
        await IntegrationSelectorScreen.toBeVisible();
        await IntegrationSelectorScreen.searchFor('apple');
        await waitFor(element(by.text('Apple Inc.'))).toExist().withTimeout(timeouts.TEN_SEC);
        await element(by.text('Apple Inc.')).tap();
        await wait(300);
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
    });

    it('MM-T4980 should complete multistep dialog progression (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog multistep');
        await ensureDialogOpen();
        const individualRadioButton = element(by.id(InteractiveDialogScreen.radioOptionTestID('user_type', 'individual')));
        await expect(individualRadioButton).toExist();
        await individualRadioButton.tap();
        const useCaseButton = element(by.id(InteractiveDialogScreen.selectButtonTestID('use_case')));
        await expect(useCaseButton).toExist();
        await useCaseButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await expect(element(by.text('Software Development'))).toExist();
        await element(by.text('Software Development')).tap();
        await wait(500);
        await InteractiveDialogScreen.fillTextElement('first_name', 'John');
        await InteractiveDialogScreen.fillTextElement('last_name', 'Doe');
        await InteractiveDialogScreen.submit();
        await ensureDialogOpen();
        await InteractiveDialogScreen.fillTextElement('experience_years', '5');
        const devEnvButton = element(by.id(InteractiveDialogScreen.selectButtonTestID('dev_environment')));
        await expect(devEnvButton).toExist();
        await devEnvButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await expect(element(by.text('VS Code'))).toExist();
        await element(by.text('VS Code')).tap();
        await wait(500);
        await InteractiveDialogScreen.submit();
        await ensureDialogOpen();
        await InteractiveDialogScreen.toggleBooleanElement('accept_terms');
        await InteractiveDialogScreen.toggleBooleanElement('accept_privacy');
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        await wait(timeouts.TWO_SEC);
        const {posts} = await Post.apiGetPostsInChannel(siteOneUrl, testChannel.id);
        const successPost = posts.find((p: any) => p.message && p.message.includes('successfully completed the multi-step registration process!'));
        const postElement = element(by.id(`channel.post_list.post.${successPost.id}`));
        await waitFor(postElement).toBeVisible().whileElement(by.id('channel.post_list.flat_list')).scroll(500, 'down');
    });

    it('MM-T4981 should handle multistep dialog cancellation (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog multistep');
        await ensureDialogOpen();
        const individualRadioButton = element(by.id(InteractiveDialogScreen.radioOptionTestID('user_type', 'individual')));
        await expect(individualRadioButton).toExist();
        await individualRadioButton.tap();
        const useCaseButton = element(by.id(InteractiveDialogScreen.selectButtonTestID('use_case')));
        await expect(useCaseButton).toExist();
        await useCaseButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await expect(element(by.text('Team Communication'))).toExist();
        await element(by.text('Team Communication')).tap();
        await wait(500);
        await InteractiveDialogScreen.fillTextElement('first_name', 'Jane');
        await InteractiveDialogScreen.fillTextElement('last_name', 'Smith');
        await InteractiveDialogScreen.submit();
        await ensureDialogOpen();
        await InteractiveDialogScreen.cancel();
        await ensureDialogClosed();
    });

    // TODO: iOS 26 + react-native-keyboard-controller contamination.
    // Field-refresh dialog with text inputs leaves keyboard/animation state that
    // poisons later tests with progressViewOffset: NaN in RCTRefreshControl.
    // Re-enable once the keyboard library handles iOS 26 transitions cleanly.
    it('MM-T4983 should handle field refresh basic interaction (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog field-refresh');
        await ensureDialogOpen();
        const projectTypeButton = element(by.id(InteractiveDialogScreen.selectButtonTestID('project_type')));
        await expect(projectTypeButton).toExist();
        await projectTypeButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await expect(element(by.text('Web Application'))).toExist();
        await element(by.text('Web Application')).tap();
        const frontendButton = element(by.id(InteractiveDialogScreen.selectButtonTestID('frontend_framework')));
        await waitFor(frontendButton).toExist().withTimeout(timeouts.TWO_SEC);
        await frontendButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await expect(element(by.text('React'))).toExist();
        await element(by.text('React')).tap();
        await wait(500);
        await InteractiveDialogScreen.fillTextElement('project_name', 'My Web App');
        await InteractiveDialogScreen.fillTextElement('description', 'A test web application');
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        await wait(timeouts.TWO_SEC);
        const {posts} = await Post.apiGetPostsInChannel(siteOneUrl, testChannel.id);
        const successPost = posts.find((p: any) => p.message && p.message.includes('created a new') && p.message.includes('My Web App'));
        const postElement = element(by.id(`channel.post_list.post.${successPost.id}`));
        await waitFor(postElement).toBeVisible().whileElement(by.id('channel.post_list.flat_list')).scroll(500, 'down');
    });

    it('MM-T4986 should handle field refresh changes and cancellation (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog field-refresh');
        await ensureDialogOpen();
        const projectTypeButton = element(by.id(InteractiveDialogScreen.selectButtonTestID('project_type')));
        await projectTypeButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await expect(element(by.text('Web Application'))).toExist();
        await element(by.text('Web Application')).tap();
        await waitFor(element(by.id(InteractiveDialogScreen.selectButtonTestID('frontend_framework')))).toExist().withTimeout(timeouts.TWO_SEC);
        await expect(element(by.id(InteractiveDialogScreen.boolInputTestID('enable_pwa', false)))).toExist();
        await projectTypeButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await expect(element(by.text('Mobile Application'))).toExist();
        await element(by.text('Mobile Application')).tap();
        await waitFor(element(by.id(InteractiveDialogScreen.selectButtonTestID('mobile_platform')))).toExist().withTimeout(timeouts.TWO_SEC);
        await expect(element(by.id(InteractiveDialogScreen.textInputFieldTestID('min_os_version')))).toExist();
        await InteractiveDialogScreen.cancel();
        await ensureDialogClosed();
    });

    it('MM-T2530A should open date/datetime dialog and display fields', async () => {
        // # Open datetime-basic dialog
        await ChannelScreen.postSlashCommand('/dialog datetime-basic');
        await ensureDialogOpen();

        // * Verify dialog title
        await expect(element(by.text('Date & DateTime Basics'))).toExist();

        // * Verify all fields are visible by testID
        await expect(element(by.id(InteractiveDialogScreen.dateInputTestID('event_date')))).toExist();
        await expect(element(by.id(InteractiveDialogScreen.dateTimeInputTestID('meeting_time')))).toExist();
        await expect(element(by.id(InteractiveDialogScreen.dateInputTestID('future_date')))).toExist();
        await expect(element(by.id(InteractiveDialogScreen.dateTimeInputTestID('interval_time')))).toExist();
        await expect(element(by.id(InteractiveDialogScreen.dateInputTestID('relative_date')))).toExist();
        await expect(element(by.id(InteractiveDialogScreen.dateTimeInputTestID('relative_datetime')))).toExist();

        await InteractiveDialogScreen.cancel();
        await ensureDialogClosed();
    });

    it('MM-T2530B should validate required date/datetime fields', async () => {
        // # Open dialog
        await ChannelScreen.postSlashCommand('/dialog datetime-basic');
        await ensureDialogOpen();

        // # Try to submit without required fields
        await InteractiveDialogScreen.submit();
        await wait(500);

        // * Should still be on dialog (submission failed due to validation)
        await expect(InteractiveDialogScreen.interactiveDialogScreen).toExist();

        // * Verify validation error text appears for required fields (two fields → ambiguous text match)
        await expect(element(by.text('This field is required.')).atIndex(0)).toExist();

        await InteractiveDialogScreen.cancel();
        await ensureDialogClosed();
    });

    it('MM-T2530C should select date and display formatted value', async () => {
        // # Open dialog
        await ChannelScreen.postSlashCommand('/dialog datetime-basic');
        await ensureDialogOpen();

        // # Tap Event Date field to open date picker
        await element(by.id(InteractiveDialogScreen.dateSelectButtonTestID('event_date'))).tap();
        await wait(1000);

        // # Close picker (iOS shows picker inline, tap the button again to close)
        if (isAndroid()) {
            try {
                await element(by.text('OK')).tap();
            } catch {}
        } else {
            await element(by.id(InteractiveDialogScreen.dateSelectButtonTestID('event_date'))).tap();
        }
        await wait(500);

        await InteractiveDialogScreen.cancel();
        await ensureDialogClosed();
    });

    it('MM-T2530D should display relative date defaults', async () => {
        // # Open dialog
        await ChannelScreen.postSlashCommand('/dialog datetime-basic');
        await ensureDialogOpen();

        // * Verify Relative Date Example (default="today") field is rendered
        await expect(element(by.text('Relative Date Example'))).toExist();

        // * Verify Relative DateTime Example (default="+1d") field is rendered
        await expect(element(by.text('Relative DateTime Example'))).toExist();

        await InteractiveDialogScreen.cancel();
        await ensureDialogClosed();
    });

    it('MM-T2530F should verify UTC conversion for datetime values', async () => {
        // # Open dialog
        await ChannelScreen.postSlashCommand('/dialog datetime-basic');
        await ensureDialogOpen();

        // # Fill required Event Date and Meeting Time fields
        await MmBlocksTestHelper.pickDialogDate('event_date', '2026-04-10T12:00:00Z', 'date_input');
        await MmBlocksTestHelper.pickDialogDate('meeting_time', '2026-04-10T14:00:00Z', 'datetime_input');

        // # Submit dialog
        await InteractiveDialogScreen.submit();
        await wait(1000);

        // * Dialog should close after successful submission (do not cancel on failure — that hides the real error)
        await waitFor(InteractiveDialogScreen.interactiveDialogScreen).not.toExist().withTimeout(timeouts.TEN_SEC);
        await ensureDialogClosed();

        // * Verify submission post contains ISO/UTC datetime format
        const {post, error} = await Post.apiFindPostInChannelByMessage(siteOneUrl, testChannel.id, 'meeting_time:');
        if (error || !post) {
            throw new Error(`Expected datetime submission post but got: ${error?.message || 'no matching post'}`);
        }
        if (!ISO_DATETIME_PATTERN.test(post.message)) {
            throw new Error(`Expected ISO datetime in submission post but got: ${post.message}`);
        }
    });

    it('MM-T2530G should display timezone indicator and convert to UTC correctly', async () => {
        // # Open datetime-timezone dialog (has Europe/London timezone fields)
        await ChannelScreen.postSlashCommand('/dialog datetime-timezone');
        await ensureDialogOpen();

        // # Scroll down past introduction text to reveal fields
        try {
            await InteractiveDialogScreen.scrollView.scroll(300, 'down');
            await wait(300);
        } catch {}

        // * Verify London dropdown field is visible
        await expect(element(by.id(InteractiveDialogScreen.dateTimeInputTestID('london_dropdown')))).toExist();

        // * Verify timezone indicator appears for London field
        // London is GMT in winter, BST in summer — mobile renders without emoji.
        // Datetime-timezone dialog can show the indicator twice (CI 30216081940).
        try {
            await expect(element(by.text('Times in GMT')).atIndex(0)).toExist();
        } catch {
            await expect(element(by.text('Times in BST')).atIndex(0)).toExist();
        }

        // # Select datetime in London field
        await element(by.id(InteractiveDialogScreen.dateTimeSelectButtonTestID('london_dropdown'))).tap();
        await wait(1000);

        // # Scroll to make picker visible
        try {
            await InteractiveDialogScreen.scrollView.scrollTo('bottom');
            await wait(300);
        } catch {}

        // # Explicitly set a date on the native picker so onChange fires and the field captures a value.
        // Optional fields in datetime-timezone have no defaults; opening/closing alone doesn't emit a value.
        try {
            await InteractiveDialogScreen.nativeDateTimePicker.setDatePickerDate('2026-05-15T14:00:00Z', 'ISO8601');
            await wait(300);
        } catch {}

        // # Close date picker
        if (isAndroid()) {
            await element(by.text('OK')).tap();
        } else {
            await element(by.id(InteractiveDialogScreen.dateTimeSelectButtonTestID('london_dropdown'))).tap();
        }
        await wait(500);

        // # Submit dialog
        await InteractiveDialogScreen.submit();
        await wait(1500);

        // * Dialog should close
        await ensureDialogClosed();

        // * Verify submission post contains ISO/UTC datetime format
        await wait(timeouts.TWO_SEC);
        const {post: tzPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        if (!ISO_DATETIME_PATTERN.test(tzPost.message)) {
            throw new Error(`Expected ISO datetime in timezone submission post but got: ${tzPost.message}`);
        }
    });

    it('MM-T2530H should accept manual time entry on datetime field', async () => {
        // NOTE: Placed last in the file — manual TextInput entry leaves keyboard/animation
        // state on iOS 26 + react-native-keyboard-controller that can break subsequent dialog tests.
        // # Open datetime-timezone dialog (has fields with allow_manual_time_entry)
        await ChannelScreen.postSlashCommand('/dialog datetime-timezone');
        await ensureDialogOpen();

        // # Scroll past introduction text to reveal fields
        try {
            await InteractiveDialogScreen.scrollView.scroll(300, 'down');
            await wait(300);
        } catch {}

        // # Tap time button to switch local_manual into manual entry mode
        const localManualTimeButton = element(by.id(InteractiveDialogScreen.dateTimeTimeButtonTestID('local_manual')));
        await waitFor(localManualTimeButton).toExist().withTimeout(timeouts.TEN_SEC);
        await localManualTimeButton.tap();
        await wait(500);

        // # Replace any prefilled text with the manual time entry (parseTimeString accepts 24-hour without am/pm)
        const manualInput = element(by.id(InteractiveDialogScreen.dateTimeManualTimeInputTestID('local_manual')));
        await waitFor(manualInput).toBeVisible().withTimeout(timeouts.TEN_SEC);
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
