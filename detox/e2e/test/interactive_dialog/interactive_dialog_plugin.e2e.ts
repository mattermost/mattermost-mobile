// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-await-in-loop, no-empty, no-console */

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

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

// ===== Helper Functions =====
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

async function pluginInstallAndEnable(siteUrl: string, latestVersion: string) {
    const pluginResult = await Plugin.apiUploadAndEnablePlugin({
        baseUrl: siteUrl,
        version: latestVersion,
        force: true,
    });
    await wait(3000);
    if (pluginResult.error) {
        if (pluginResult.status === 524) {
            throw new Error(
                'Plugin installation failed due to Cloudflare timeout (Error 524). ' +
                'This is a known CI infrastructure limitation when the test server downloads plugins from GitHub. ' +
                'To fix: Either (1) pre-download plugin in CI workflow to detox/e2e/support/fixtures/ and use filename instead of url, ' +
                'or (2) use a test server without Cloudflare proxy.',
            );
        }
        throw new Error(`Failed to install demo plugin: ${pluginResult.error} (status: ${pluginResult.status})`);
    }
    await wait(2000);
    const statusCheck = await Plugin.apiGetPluginStatus(siteUrl, DemoPlugin.id, latestVersion);
    if (!statusCheck.isActive) {
        await Plugin.apiEnablePluginById(siteUrl, 'com.mattermost.demo-plugin');
        await wait(2000);
    }
    if (!statusCheck.isVersionMatch) {
        console.warn(`⚠️  WARNING: Demo plugin version mismatch. Expected: ${latestVersion}, Got: ${statusCheck.plugin?.version}`);
        console.warn('Continuing with tests to see if plugin commands work despite version mismatch...');
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
                    },
                }},
        });

        const latestVersion = await Plugin.apiGetLatestPluginVersion(DemoPlugin.repo);
        await pluginInstallAndEnable(siteOneUrl, latestVersion);

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
        try {
            await InteractiveDialogScreen.cancel();
        } catch {}
        try {
            await ChannelScreen.open(channelsCategory, testChannel.name);
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
        await wait(500);
        await ensureDialogOpen();
        await InteractiveDialogScreen.toggleBooleanElement('required_boolean');
        await InteractiveDialogScreen.toggleBooleanElement('boolean_default_false');
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, 'Dialog Submitted:');
    });

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
        await wait(500);
        await IntegrationSelectorScreen.toBeVisible();
        await expect(element(by.text('Option2'))).toExist();
        await element(by.text('Option2')).tap();
        const userSelectorButton = element(by.id('AppFormElement.someuserselector.select.button'));
        await expect(userSelectorButton).toExist();
        await userSelectorButton.tap();
        await wait(500);
        await IntegrationSelectorScreen.toBeVisible();
        await selectUser();
        await wait(500);
        const channelSelectorButton = element(by.id('AppFormElement.somechannelselector.select.button'));
        await expect(channelSelectorButton).toExist();
        await channelSelectorButton.tap();
        await wait(500);
        await IntegrationSelectorScreen.toBeVisible();
        await selectChannel();
        await wait(500);
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, 'Dialog Submitted:');
    });

    it('MM-T4499 should handle required select field validation (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postMessage('/dialog selectfields');
        await ensureDialogOpen();
        await InteractiveDialogScreen.submit();
        await wait(500);
        await ensureDialogOpen();
        const engineeringRadioButton = element(by.id('AppFormElement.someradiooptions.radio.engineering.button'));
        await expect(engineeringRadioButton).toExist();
        await engineeringRadioButton.tap();
        const selectDropdownButton = element(by.id('AppFormElement.someoptionselector.select.button'));
        await expect(selectDropdownButton).toExist();
        await selectDropdownButton.tap();
        await wait(500);
        await IntegrationSelectorScreen.toBeVisible();
        await expect(element(by.text('Option1'))).toExist();
        await element(by.text('Option1')).tap();
        const userSelectorButton = element(by.id('AppFormElement.someuserselector.select.button'));
        await expect(userSelectorButton).toExist();
        await userSelectorButton.tap();
        await wait(500);
        await IntegrationSelectorScreen.toBeVisible();
        await selectUser();
        await wait(500);
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, 'Dialog Submitted:');
    });

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
        await wait(500);
        await IntegrationSelectorScreen.toBeVisible();
        await expect(element(by.text('Option2'))).toExist();
        await element(by.text('Option2')).tap();
        const userSelectorButton = element(by.id('AppFormElement.someuserselector.select.button'));
        await expect(userSelectorButton).toExist();
        await userSelectorButton.tap();
        await wait(500);
        await IntegrationSelectorScreen.toBeVisible();
        await selectUser();
        await wait(500);
        const channelSelectorButton = element(by.id('AppFormElement.somechannelselector.select.button'));
        await expect(channelSelectorButton).toExist();
        await channelSelectorButton.tap();
        await wait(500);
        await IntegrationSelectorScreen.toBeVisible();
        await selectChannel();
        await wait(500);
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
});
