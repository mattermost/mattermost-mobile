// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-await-in-loop, no-empty, no-console */

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {downloadPluginIfMissing} from '@support/plugin_download';
import {
    DemoPlugin,
    Plugin,
    Setup,
    System,
    User,
    Post,
} from '@support/server_api';
import {apiDisablePluginById} from '@support/server_api/plugin';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    ChannelScreen,
    IntegrationSelectorScreen,
    InteractiveDialogScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {wait, isAndroid} from '@support/utils';
import {expect} from 'detox';

const ISO_DATETIME_PATTERN = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})/;

// ===== Helper Functions =====
// Integration selector list items use different testID structures per data source:
//   user list:    integration_selector.user_list.user_item.<user.id>
//                 (UserItem composes ${testID}.${user.id})
//   channel list: integration_selector.channel_list.<channel.id>
//                 (ChannelListRow composes ${testID}.${id})
//   option list:  no specific testID — identified by visible text
// For single-select selectors, tapping an item auto-closes the modal.
// For multi-select selectors, tapping marks the item; the test must call
// IntegrationSelectorScreen.done() afterward to confirm selections.
// Tap the selector at the LIST level (not a per-item id) — the working pattern
// from PR #9847. With UserItem's testID now on the touchable, this fires onPress;
// single-select auto-closes the modal, multi-select needs done().
async function selectUser() {
    const patterns = [
        'integration_selector.user_list.user_item',
        'integration_selector.user_list',
        'integration_selector.user_list.section_list',
    ];
    for (const testID of patterns) {
        try {
            const el = element(by.id(testID));
            await expect(el).toExist();
            await el.tap();
            return true;
        } catch {}
    }
    try {
        await IntegrationSelectorScreen.done();
    } catch {}
    return false;
}

async function selectChannel() {
    const patterns = [
        'integration_selector.channel_list',
        'integration_selector.channel_list.channel_item',
    ];
    for (const testID of patterns) {
        try {
            const el = element(by.id(testID));
            await expect(el).toExist();
            await el.tap();
            return true;
        } catch {}
    }
    for (const name of ['Town Square', 'Off-Topic', 'General']) {
        try {
            const el = element(by.text(name));
            await expect(el).toExist();
            await el.tap();
            return true;
        } catch {}
    }
    try {
        await IntegrationSelectorScreen.done();
    } catch {}
    return false;
}

async function ensureDialogClosed() {
    try {
        await waitFor(InteractiveDialogScreen.interactiveDialogScreen).not.toExist().withTimeout(3000);
    } catch {}

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
    await waitFor(InteractiveDialogScreen.interactiveDialogScreen).toExist().withTimeout(3000);
    await InteractiveDialogScreen.toBeVisible();
    await expect(InteractiveDialogScreen.interactiveDialogScreen).toExist();
}

async function dismissErrorAlert() {
    try {
        isAndroid() ? await element(by.text('OK')).tap() : await element(by.label('OK')).atIndex(1);
        await wait(300);
    } catch {}
}

async function pluginInstallAndEnable(siteUrl: string) {
    const result = await Plugin.installAndEnablePlugin(
        siteUrl,
        DemoPlugin.filename,
        DemoPlugin.id,
        DemoPlugin.version,
    );
    if (result.error) {
        throw new Error(`Failed to install demo plugin: ${result.error} (status: ${result.status})`);
    }
}

describe('Interactive Dialog - Basic Dialog (Plugin)', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
        // Log environment info for debugging CI vs local differences
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

        await User.apiAdminLogin(siteOneUrl);
        await System.shouldHavePluginUploadEnabled(siteOneUrl);
        await System.apiUpdateConfig(siteOneUrl, {
            ServiceSettings: {EnableGifPicker: true},
            FileSettings: {EnablePublicLink: true},
            FeatureFlags: {InteractiveDialogAppsForm: true},
            PluginSettings: {
                Enable: true,
                AllowInsecureDownloadUrl: true,
                EnableUploads: true,
                PluginStates: {
                    'com.mattermost.demo-plugin': {'Enable': true},
                },
                Plugins: {
                    'com.mattermost.demo-plugin': {
                        'DialogOnlyMode': true,
                        'username': 'demouser',
                        'channelname': 'demo',
                        'lastname': 'User',
                    },
                }},
        });

        await downloadPluginIfMissing(DemoPlugin.downloadUrl, DemoPlugin.filename);
        await pluginInstallAndEnable(siteOneUrl);

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await ChannelListScreen.toBeVisible();
        await ChannelScreen.open(channelsCategory, testChannel.name);
    });

    afterAll(async () => {
        await apiDisablePluginById(siteOneUrl, DemoPlugin.id);
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
            await InteractiveDialogScreen.cancel();
        } catch {}

        // Closing the dialog returns to the channel screen, so just confirm we're
        // there rather than re-opening via the sidebar (ChannelScreen.open waits up
        // to ONE_MIN for a sidebar that isn't visible here — ~60s wasted per test).
        try {
            await ChannelScreen.toBeVisible();
        } catch {}
        await wait(500);
    });

    it('MM-T4101 should open simple interactive dialog (Plugin)', async () => {
        await ChannelScreen.postMessage('/dialog basic');
        await ensureDialogOpen();
        await InteractiveDialogScreen.cancel();
        await ensureDialogClosed();
    });

    it('MM-T4102 should submit simple interactive dialog (Plugin)', async () => {
        await ChannelScreen.postMessage('/dialog basic');
        await ensureDialogOpen();
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, 'Dialog Submitted:');
    });

    it('MM-T4103 should fill text field and submit dialog (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postMessage('/dialog basic');
        await ensureDialogOpen();
        await InteractiveDialogScreen.fillTextElement('optional_text', 'Plugin Test Value');
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, 'Dialog Submitted:');
    });

    it('MM-T4104 should handle server error on dialog submission (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postMessage('/dialog error');
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
        await ChannelScreen.postMessage('/dialog boolean');
        await ensureDialogOpen();
        await expect(element(by.id('AppFormElement.required_boolean.toggled..button'))).toExist();
        await expect(element(by.id('AppFormElement.optional_boolean.toggled..button'))).toExist();
        await expect(element(by.id('AppFormElement.boolean_default_true.toggled.true.button'))).toExist();
        await expect(element(by.id('AppFormElement.boolean_default_false.toggled..button'))).toExist();
        await InteractiveDialogScreen.toggleBooleanElement('required_boolean');
        await InteractiveDialogScreen.toggleBooleanElement('boolean_default_false');
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, 'Dialog Submitted:');
    });

    it('MM-T4402 should handle boolean field validation (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postMessage('/dialog boolean');
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

    // TODO: iOS 26 + Detox + RN TouchableOpacity hit-test regression.
    // Tapping a row in the integration_selector user list (UserItem wraps
    // testID-bearing View in TouchableOpacity) doesn't fire onPress under
    // Detox synthetic taps — manual mouse taps work. tap/tapAtPoint/
    // longPress/multiTap/swipe all attempted, none propagate to the
    // touchable. Channel rows work because CustomListRow places testID on
    // the TouchableOpacity directly.
    it('MM-T4498 should open and handle interactive dialog with select fields (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postMessage('/dialog selectfields');
        await ensureDialogOpen();
        const engineeringRadioButton = element(by.id('AppFormElement.someradiooptions.radio.engineering.button'));
        await expect(engineeringRadioButton).toExist();
        await engineeringRadioButton.tap();
        const selectDropdownButton = element(by.id('AppFormElement.someoptionselector.select.button'));
        await expect(selectDropdownButton).toExist();
        await selectDropdownButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await expect(element(by.text('Option2'))).toExist();
        await element(by.text('Option2')).tap();
        const userSelectorButton = element(by.id('AppFormElement.someuserselector.select.button'));
        await expect(userSelectorButton).toExist();
        await userSelectorButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await selectUser();
        const channelSelectorButton = element(by.id('AppFormElement.somechannelselector.select.button'));
        await waitFor(channelSelectorButton).toExist().withTimeout(1000);
        await channelSelectorButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await selectChannel();
        await wait(300);
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, 'Dialog Submitted:');
    });

    // TODO: iOS 26 + Detox UserItem TouchableOpacity tap regression — see MM-T4498
    it('MM-T4499 should handle required select field validation (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postMessage('/dialog selectfields');
        await ensureDialogOpen();
        await InteractiveDialogScreen.submit();
        await wait(300);
        await ensureDialogOpen();
        const engineeringRadioButton = element(by.id('AppFormElement.someradiooptions.radio.engineering.button'));
        await expect(engineeringRadioButton).toExist();
        await engineeringRadioButton.tap();
        const selectDropdownButton = element(by.id('AppFormElement.someoptionselector.select.button'));
        await expect(selectDropdownButton).toExist();
        await selectDropdownButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await expect(element(by.text('Option1'))).toExist();
        await element(by.text('Option1')).tap();
        const userSelectorButton = element(by.id('AppFormElement.someuserselector.select.button'));
        await expect(userSelectorButton).toExist();
        await userSelectorButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await selectUser();
        await wait(300);
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, 'Dialog Submitted:');
    });

    // TODO: iOS 26 + Detox UserItem TouchableOpacity tap regression — see MM-T4498
    it('MM-T4500 should handle different selector types (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postMessage('/dialog selectfields');
        await ensureDialogOpen();
        const engineeringRadioButton = element(by.id('AppFormElement.someradiooptions.radio.engineering.button'));
        await expect(engineeringRadioButton).toExist();
        await engineeringRadioButton.tap();
        const selectDropdownButton = element(by.id('AppFormElement.someoptionselector.select.button'));
        await expect(selectDropdownButton).toExist();
        await selectDropdownButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await expect(element(by.text('Option2'))).toExist();
        await element(by.text('Option2')).tap();
        const userSelectorButton = element(by.id('AppFormElement.someuserselector.select.button'));
        await expect(userSelectorButton).toExist();
        await userSelectorButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await selectUser();
        const channelSelectorButton = element(by.id('AppFormElement.somechannelselector.select.button'));
        await waitFor(channelSelectorButton).toExist().withTimeout(1000);
        await channelSelectorButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await selectChannel();
        await wait(300);
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, 'Dialog Submitted:');
    });

    it('MM-T4201 should fill and submit all text field types (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postMessage('/dialog textfields');
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
        await ChannelScreen.postMessage('/dialog textfields');
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
        await ChannelScreen.postMessage('/dialog textfields');
        await ensureDialogOpen();
        await InteractiveDialogScreen.fillTextElement('email_field', 'valid.email+test@example.com');
        await InteractiveDialogScreen.fillTextElement('number_field', '12345');
        await InteractiveDialogScreen.fillTextElement('required_text', 'Subtype test complete');
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, 'Dialog Submitted:');
    });

    // TODO: iOS 26 + Detox UserItem TouchableOpacity tap regression — see MM-T4498
    it('MM-T4976 should handle multiselect fields dialog (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postMessage('/dialog multi-select');
        await ensureDialogOpen();
        const multiselectUsersButton = element(by.id('AppFormElement.multiselect_users.select.button'));
        await expect(multiselectUsersButton).toExist();
        await multiselectUsersButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await selectUser();
        await wait(500);
        await IntegrationSelectorScreen.done();
        await wait(300);
        const multiselectChannelsButton = element(by.id('AppFormElement.multiselect_channels.select.button'));
        await expect(multiselectChannelsButton).toExist();
        await multiselectChannelsButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await selectChannel();
        await wait(500);
        await IntegrationSelectorScreen.done();
        await wait(300);
        const multiselectOptionsButton = element(by.id('AppFormElement.multiselect_options.select.button'));
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
        await ChannelScreen.postMessage('/dialog dynamic-select');
        await ensureDialogOpen();
        const dynamicProductsButton = element(by.id('AppFormElement.dynamic_products.select.button'));
        await expect(dynamicProductsButton).toExist();
        await dynamicProductsButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await IntegrationSelectorScreen.searchFor('macbook');
        await waitFor(element(by.text('MacBook Pro 16-inch'))).toExist().withTimeout(3000);
        await element(by.text('MacBook Pro 16-inch')).tap();
        await wait(300);
        const dynamicCompaniesButton = element(by.id('AppFormElement.dynamic_companies.select.button'));
        await waitFor(dynamicCompaniesButton).toExist().withTimeout(3000);
        await dynamicCompaniesButton.tap();
        await wait(300);
        await IntegrationSelectorScreen.toBeVisible();
        await IntegrationSelectorScreen.searchFor('apple');
        await waitFor(element(by.text('Apple Inc.'))).toExist().withTimeout(3000);
        await element(by.text('Apple Inc.')).tap();
        await wait(300);
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
    });

    it('MM-T4980 should complete multistep dialog progression (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postMessage('/dialog multistep');
        await ensureDialogOpen();
        const individualRadioButton = element(by.id('AppFormElement.user_type.radio.individual.button'));
        await expect(individualRadioButton).toExist();
        await individualRadioButton.tap();
        const useCaseButton = element(by.id('AppFormElement.use_case.select.button'));
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
        const devEnvButton = element(by.id('AppFormElement.dev_environment.select.button'));
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
        await wait(2000);
        const {posts} = await Post.apiGetPostsInChannel(siteOneUrl, testChannel.id);
        const successPost = posts.find((p: any) => p.message && p.message.includes('successfully completed the multi-step registration process!'));
        const postElement = element(by.id(`channel.post_list.post.${successPost.id}`));
        await waitFor(postElement).toBeVisible().whileElement(by.id('channel.post_list.flat_list')).scroll(500, 'down');
    });

    it('MM-T4981 should handle multistep dialog cancellation (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postMessage('/dialog multistep');
        await ensureDialogOpen();
        const individualRadioButton = element(by.id('AppFormElement.user_type.radio.individual.button'));
        await expect(individualRadioButton).toExist();
        await individualRadioButton.tap();
        const useCaseButton = element(by.id('AppFormElement.use_case.select.button'));
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
        await ChannelScreen.postMessage('/dialog field-refresh');
        await ensureDialogOpen();
        const projectTypeButton = element(by.id('AppFormElement.project_type.select.button'));
        await expect(projectTypeButton).toExist();
        await projectTypeButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await expect(element(by.text('Web Application'))).toExist();
        await element(by.text('Web Application')).tap();
        const frontendButton = element(by.id('AppFormElement.frontend_framework.select.button'));
        await waitFor(frontendButton).toExist().withTimeout(2000);
        await frontendButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await expect(element(by.text('React'))).toExist();
        await element(by.text('React')).tap();
        await wait(500);
        await InteractiveDialogScreen.fillTextElement('project_name', 'My Web App');
        await InteractiveDialogScreen.fillTextElement('description', 'A test web application');
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        await wait(2000);
        const {posts} = await Post.apiGetPostsInChannel(siteOneUrl, testChannel.id);
        const successPost = posts.find((p: any) => p.message && p.message.includes('created a new') && p.message.includes('My Web App'));
        const postElement = element(by.id(`channel.post_list.post.${successPost.id}`));
        await waitFor(postElement).toBeVisible().whileElement(by.id('channel.post_list.flat_list')).scroll(500, 'down');
    });

    it('MM-T4986 should handle field refresh changes and cancellation (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postMessage('/dialog field-refresh');
        await ensureDialogOpen();
        const projectTypeButton = element(by.id('AppFormElement.project_type.select.button'));
        await projectTypeButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await expect(element(by.text('Web Application'))).toExist();
        await element(by.text('Web Application')).tap();
        await waitFor(element(by.id('AppFormElement.frontend_framework.select.button'))).toExist().withTimeout(2000);
        await expect(element(by.id('AppFormElement.enable_pwa.toggled..button'))).toExist();
        await projectTypeButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await expect(element(by.text('Mobile Application'))).toExist();
        await element(by.text('Mobile Application')).tap();
        await waitFor(element(by.id('AppFormElement.mobile_platform.select.button'))).toExist().withTimeout(2000);
        await expect(element(by.id('AppFormElement.min_os_version.input'))).toExist();
        await InteractiveDialogScreen.cancel();
        await ensureDialogClosed();
    });

    it('MM-T2530A should open date/datetime dialog and display fields', async () => {
        // # Open datetime-basic dialog
        await ChannelScreen.postMessage('/dialog datetime-basic');
        await wait(500);
        await ensureDialogOpen();

        // * Verify dialog title
        await expect(element(by.text('Date & DateTime Basics'))).toExist();

        // * Verify all fields are visible by testID
        await expect(element(by.id('AppFormElement.event_date'))).toExist();
        await expect(element(by.id('AppFormElement.meeting_time'))).toExist();
        await expect(element(by.id('AppFormElement.future_date'))).toExist();
        await expect(element(by.id('AppFormElement.interval_time'))).toExist();
        await expect(element(by.id('AppFormElement.relative_date'))).toExist();
        await expect(element(by.id('AppFormElement.relative_datetime'))).toExist();

        await InteractiveDialogScreen.cancel();
        await ensureDialogClosed();
    });

    it('MM-T2530B should validate required date/datetime fields', async () => {
        // # Open dialog
        await ChannelScreen.postMessage('/dialog datetime-basic');
        await wait(500);
        await ensureDialogOpen();

        // # Try to submit without required fields
        await InteractiveDialogScreen.submit();
        await wait(500);

        // * Should still be on dialog (submission failed due to validation)
        await expect(InteractiveDialogScreen.interactiveDialogScreen).toExist();

        // * Verify validation error text appears for required fields
        await expect(element(by.text('This field is required.'))).toExist();

        await InteractiveDialogScreen.cancel();
        await ensureDialogClosed();
    });

    it('MM-T2530C should select date and display formatted value', async () => {
        // # Open dialog
        await ChannelScreen.postMessage('/dialog datetime-basic');
        await wait(500);
        await ensureDialogOpen();

        // # Tap Event Date field to open date picker
        await element(by.id('AppFormElement.event_date.select.button')).tap();
        await wait(1000);

        // # Close picker (iOS shows picker inline, tap the button again to close)
        if (isAndroid()) {
            try {
                await element(by.text('OK')).tap();
            } catch {}
        } else {
            await element(by.id('AppFormElement.event_date.select.button')).tap();
        }
        await wait(500);

        await InteractiveDialogScreen.cancel();
        await ensureDialogClosed();
    });

    it('MM-T2530D should display relative date defaults', async () => {
        // # Open dialog
        await ChannelScreen.postMessage('/dialog datetime-basic');
        await wait(500);
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
        await ChannelScreen.postMessage('/dialog datetime-basic');
        await wait(500);
        await ensureDialogOpen();

        // # Fill required Event Date field
        await element(by.id('AppFormElement.event_date.select.button')).tap();
        await wait(500);
        if (isAndroid()) {
            await element(by.text('OK')).tap();
        } else {
            await element(by.id('AppFormElement.event_date')).tap();
        }
        await wait(300);

        // # Fill required Meeting Time field
        await element(by.id('AppFormElement.meeting_time.select.button')).tap();
        await wait(500);
        if (isAndroid()) {
            await element(by.text('OK')).tap();
        } else {
            await element(by.id('AppFormElement.meeting_time')).tap();
        }
        await wait(300);

        // # Submit dialog
        await InteractiveDialogScreen.submit();
        await wait(1000);

        // * Dialog should close after successful submission
        await ensureDialogClosed();

        // * Verify submission post contains ISO/UTC datetime format
        await wait(1000);
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // Meeting Time should be in ISO format with T separator (e.g., 2026-04-10T14:00:00.000Z)
        if (!ISO_DATETIME_PATTERN.test(post.message)) {
            throw new Error(`Expected ISO datetime in submission post but got: ${post.message}`);
        }
    });

    it('MM-T2530G should display timezone indicator and convert to UTC correctly', async () => {
        // # Open datetime-timezone dialog (has Europe/London timezone fields)
        await ChannelScreen.postMessage('/dialog datetime-timezone');
        await wait(500);
        await ensureDialogOpen();

        // # Scroll down past introduction text to reveal fields
        try {
            await element(by.id('interactive_dialog.screen')).scroll(300, 'down');
            await wait(300);
        } catch {}

        // * Verify London dropdown field is visible
        await expect(element(by.id('AppFormElement.london_dropdown'))).toExist();

        // * Verify timezone indicator appears for London field
        // London is GMT in winter, BST in summer — mobile renders without emoji
        try {
            await expect(element(by.text('Times in GMT'))).toExist();
        } catch {
            await expect(element(by.text('Times in BST'))).toExist();
        }

        // # Select datetime in London field
        await element(by.id('AppFormElement.london_dropdown.select.button')).tap();
        await wait(1000);

        // # Scroll to make picker visible
        try {
            await element(by.id('interactive_dialog.scroll_view')).scrollTo('bottom');
            await wait(300);
        } catch {}

        // # Explicitly set a date on the native picker so onChange fires and the field captures a value.
        // Optional fields in datetime-timezone have no defaults; opening/closing alone doesn't emit a value.
        try {
            await element(by.id('custom_status_clear_after.date_time_picker')).setDatePickerDate('2026-05-15T14:00:00Z', 'ISO8601');
            await wait(300);
        } catch {}

        // # Close date picker
        if (isAndroid()) {
            await element(by.text('OK')).tap();
        } else {
            await element(by.id('AppFormElement.london_dropdown.select.button')).tap();
        }
        await wait(500);

        // # Submit dialog
        await InteractiveDialogScreen.submit();
        await wait(1500);

        // * Dialog should close
        await ensureDialogClosed();

        // * Verify submission post contains ISO/UTC datetime format
        await wait(2000);
        const {post: tzPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        if (!ISO_DATETIME_PATTERN.test(tzPost.message)) {
            throw new Error(`Expected ISO datetime in timezone submission post but got: ${tzPost.message}`);
        }
    });

    it('MM-T2530H should accept manual time entry on datetime field', async () => {
        // NOTE: Placed last in the file — manual TextInput entry leaves keyboard/animation
        // state on iOS 26 + react-native-keyboard-controller that can break subsequent dialog tests.
        // # Open datetime-timezone dialog (has fields with allow_manual_time_entry)
        await ChannelScreen.postMessage('/dialog datetime-timezone');
        await wait(500);
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
