// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-await-in-loop, no-empty, no-console */

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import path from 'path';

import {
    DemoPlugin,
    Plugin,
    Setup,
    System,
    User,
    Post,
} from '@support/server_api';
import {apiDisablePluginById, apiSubmitDemoPluginFileUploadDialog} from '@support/server_api/plugin';
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
import {wait, isAndroid, timeouts} from '@support/utils';
import {expect} from 'detox';

const FILE_UPLOAD_FIXTURE = path.resolve(__dirname, '../../../../support/fixtures/sample.txt');

// MM-66558: dialog fields use replaceText instead of typeText.

async function dismissAttachmentOptions() {
    try {
        await waitFor(AttachmentOptions.photoLibrary).toExist().withTimeout(3000);
        await AttachmentOptions.photoLibrary.swipe('down', 'fast', 0.5);
        await waitFor(AttachmentOptions.photoLibrary).not.toExist().withTimeout(3000);
    } catch {}
}

async function seedFileUploadDialogViaApi(
    user: any,
    testChannelId: string,
    testTeamId: string,
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
        submission: {single_file: fileId},
        fileIds: [fileId],
    });
    if (submitResult.error) {
        throw new Error(`Failed to seed file upload dialog via plugin: ${JSON.stringify(submitResult.error)}`);
    }

    await User.apiAdminLogin(siteOneUrl);

    return fileId;
}

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

    // Swipe up on post list to reveal new posts that might be hidden behind input
    try {
        await element(by.id('channel.post_list.flat_list')).swipe('up', 'fast', 0.2);
        await wait(300);
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
        filename: 'mattermost-plugin-demo-v0.11.1-linux-amd64.tar.gz',
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
    let testTeam: any;
    let testUser: any;
    let pluginAvailable = false;
    let pluginSetupTouchedServer = false;

    beforeAll(async () => {
        // Log environment info for debugging CI vs local differences
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testTeam = team;
        testUser = user;

        await User.apiAdminLogin(siteOneUrl);

        // Check if demo plugin can be set up; any failure or excessive wait
        // skips the entire suite gracefully. The plugin download from GitHub can
        // hang behind Cloudflare in CI, so cap the setup phase to avoid the
        // default 240 s Jest hook timeout.
        const PLUGIN_SETUP_TIMEOUT = 60000;
        try {
            await Promise.race([
                (async () => {
                    await System.shouldHavePluginUploadEnabled(siteOneUrl);

                    pluginSetupTouchedServer = true;
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

                    // Verify the plugin is actually active before continuing
                    const statusCheck = await Plugin.apiGetPluginStatus(siteOneUrl, DemoPlugin.id);
                    if (!statusCheck.isActive) {
                        throw new Error(`Demo plugin (${DemoPlugin.id}) is not active after installation`);
                    }
                })(),
                new Promise((_resolve, reject) =>
                    setTimeout(() => reject(new Error(`plugin setup did not complete within ${PLUGIN_SETUP_TIMEOUT}ms`)), PLUGIN_SETUP_TIMEOUT),
                ),
            ]);
        } catch (err: any) {
            console.warn(`Demo plugin setup failed — skipping interactive dialog suite: ${err.message || err}`);
            return;
        }

        pluginAvailable = true;

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await ChannelListScreen.toBeVisible();
        await ChannelScreen.open(channelsCategory, testChannel.name);
    });

    afterAll(async () => {
        try {
            if (pluginAvailable) {
                await HomeScreen.logout();
            }
        } catch {
            // best-effort logout so later specs on this shard start clean
        }

        if (pluginSetupTouchedServer) {
            try {
                await apiDisablePluginById(siteOneUrl, DemoPlugin.id);
            } catch {
                // best-effort plugin cleanup even when setup only partially succeeded
            }
        }
    });

    afterEach(async () => {
        if (!pluginAvailable) {
            return;
        }
        await dismissErrorAlert();
        try {
            await InteractiveDialogScreen.cancel();
        } catch {}
        await wait(500);
    });

    it('MM-T4101 should open simple interactive dialog (Plugin)', async () => {
        if (!pluginAvailable) {
            return;
        }
        await ChannelScreen.postSlashCommand('/dialog basic');
        await ensureDialogOpen();
        await InteractiveDialogScreen.cancel();
        await ensureDialogClosed();
    });

    it('MM-T4102 should submit simple interactive dialog (Plugin)', async () => {
        if (!pluginAvailable) {
            return;
        }
        await ChannelScreen.postSlashCommand('/dialog basic');
        await ensureDialogOpen();
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, 'Dialog Submitted:');
    });

    it('MM-T4103 should fill text field and submit dialog (Plugin)', async () => {
        if (!pluginAvailable) {
            return;
        }
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
        if (!pluginAvailable) {
            return;
        }
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
        if (!pluginAvailable) {
            return;
        }
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog boolean');
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
        if (!pluginAvailable) {
            return;
        }
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

    it('MM-T4498 should open and handle interactive dialog with select fields (Plugin)', async () => {
        if (!pluginAvailable) {
            return;
        }
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog selectfields');
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

    it('MM-T4499 should handle required select field validation (Plugin)', async () => {
        if (!pluginAvailable) {
            return;
        }
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog selectfields');
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

    it('MM-T4500 should handle different selector types (Plugin)', async () => {
        if (!pluginAvailable) {
            return;
        }
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog selectfields');
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
        if (!pluginAvailable) {
            return;
        }
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
        if (!pluginAvailable) {
            return;
        }
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
        if (!pluginAvailable) {
            return;
        }
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
        if (!pluginAvailable) {
            return;
        }
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog multi-select');
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
        if (!pluginAvailable) {
            return;
        }
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog dynamic-select');
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
        if (!pluginAvailable) {
            return;
        }
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog multistep');
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
        if (!pluginAvailable) {
            return;
        }
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog multistep');
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

    it('MM-T4983 should handle field refresh basic interaction (Plugin)', async () => {
        if (!pluginAvailable) {
            return;
        }
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog field-refresh');
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
        if (!pluginAvailable) {
            return;
        }
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog field-refresh');
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

    describe('Interactive Dialog - File Upload (Plugin)', () => {
        it('MM-T6070_1 - should render file upload dialog, open attachment options, and submit with no files (Plugin)', async () => {
            if (!pluginAvailable) {
                return;
            }
            await ensureDialogClosed();
            await postSlashCommandDirect('/dialog file-upload');
            await ensureDialogOpen();

            await expect(element(by.text('File Upload Dialog Demo'))).toExist();
            await expect(element(by.text('Single File Upload'))).toExist();
            await expect(element(by.text('Multiple File Upload'))).toExist();
            await expect(element(by.text('Choose File'))).toExist();
            await expect(element(by.text('Choose Files'))).toExist();
            await expect(InteractiveDialogScreen.getFileFieldChooseButton('single_file')).toExist();
            await expect(InteractiveDialogScreen.getFileFieldChooseButton('multi_file')).toExist();

            await InteractiveDialogScreen.tapFileFieldChooseButton('single_file');
            await waitFor(AttachmentOptions.photoLibrary).toExist().withTimeout(3000);
            await expect(AttachmentOptions.attachFile).toExist();
            await dismissAttachmentOptions();

            await InteractiveDialogScreen.submit();
            await ensureDialogClosed();

            const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
            let match = post.message.match(/(.+) submitted a file upload dialog/);
            if (!match || !match[1]) {
                throw new Error(`Expected post to contain submission confirmation but got: ${post.message}`);
            }
            match = post.message.match(/\*\*Files:\*\* (.+)/);
            if (!match || !match[1]) {
                throw new Error(`Expected post to contain Files field but got: ${post.message}`);
            }

            const filesSubmitted = match[1];
            if (!/none/.test(filesSubmitted)) {
                throw new Error(`Expected no files to be submitted but got: ${filesSubmitted}`);
            }
        });

        it('MM-T6072_1 - should disable file field choose when mobile upload is disabled (Plugin)', async () => {
            if (!pluginAvailable) {
                return;
            }
            try {
                await ensureDialogClosed();
                await System.apiUpdateConfig(siteOneUrl, {
                    FileSettings: {EnableMobileUpload: false},
                });
                await wait(2000);

                await postSlashCommandDirect('/dialog file-upload');
                await ensureDialogOpen();
                await InteractiveDialogScreen.expectFileFieldUploadDisabledWarning('single_file');
                await InteractiveDialogScreen.expectFileFieldUploadDisabledWarning('multi_file');

                await InteractiveDialogScreen.cancel();
                await ensureDialogClosed();
            } finally {
                await System.apiUpdateConfig(siteOneUrl, {
                    FileSettings: {EnableMobileUpload: true},
                });
                await wait(2000);
            }
        });

        it('MM-T6073_1 - should hydrate file field from plugin persisted file IDs on re-open (Plugin)', async () => {
            if (!pluginAvailable) {
                return;
            }
            await ensureDialogClosed();

            let fileId: string;
            try {
                fileId = await seedFileUploadDialogViaApi(testUser, testChannel.id, testTeam.id);
            } catch (err: any) {
                throw new Error(`File upload hydration seed failed (check file ownership / plugin file-upload support): ${err.message || err}`);
            }

            await postSlashCommandDirect('/dialog file-upload');
            await ensureDialogOpen();
            await InteractiveDialogScreen.expectHydratedFilePreview('single_file', fileId);

            // * Choose button should be disabled while a file is attached
            await InteractiveDialogScreen.expectFileFieldChooseButtonDisabled('single_file');

            // # Remove the file
            await InteractiveDialogScreen.tapFileFieldRemoveButton('single_file', fileId);

            // * Choose button should be enabled after removal
            await InteractiveDialogScreen.expectFileFieldChooseButtonEnabled('single_file');

            await InteractiveDialogScreen.cancel();
            await ensureDialogClosed();
        });
    });
});
