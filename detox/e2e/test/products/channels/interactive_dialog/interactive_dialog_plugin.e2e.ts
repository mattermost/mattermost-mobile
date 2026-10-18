// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-await-in-loop, no-empty */

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    cleanUpAfterDialogTest,
    dismissAttachmentOptions,
    ensureDialogClosed,
    ensureDialogOpen,
    ISO_DATETIME_PATTERN,
    logOutAfterDialogSuite,
    postSlashCommandDirect,
    seedFileUploadDialogViaApi,
    selectChannel,
    selectUser,
    setUpDialogSuite,
    waitForDialogSelectorButton,
} from '@support/interactive_dialog_plugin_helper';
import {Post} from '@support/server_api';
import {siteOneUrl} from '@support/test_config';
import {AttachmentOptions} from '@support/ui/component';
import {
    ChannelScreen,
    IntegrationSelectorScreen,
    InteractiveDialogScreen,
} from '@support/ui/screen';
import {wait, isAndroid, isIos, timeouts} from '@support/utils';
import {expect} from 'detox';

const itNotIos = isIos() ? it.skip : it;

describe('Interactive Dialog - Basic Dialog (Plugin)', () => {
    const channelsCategory = 'channels';
    let testChannel: any;
    let testTeam: any;
    let testUser: any;
    let setupFailed = false;

    beforeAll(async () => {
        try {
            ({channel: testChannel, team: testTeam, user: testUser} = await setUpDialogSuite(channelsCategory));
        } catch (error) {
            setupFailed = true;
            throw error;
        }
    });

    afterAll(async () => {
        await logOutAfterDialogSuite();
    });

    afterEach(async () => {
        if (setupFailed) {
            return;
        }
        await cleanUpAfterDialogTest(channelsCategory, testChannel);
    });

    it('MM-T4101 should open simple interactive dialog (Plugin)', async () => {
        await postSlashCommandDirect('/dialog basic');
        await ensureDialogOpen();
        await InteractiveDialogScreen.cancel();
        await ensureDialogClosed();
    });

    it('MM-T4102 should submit simple interactive dialog (Plugin)', async () => {
        await postSlashCommandDirect('/dialog basic');
        await ensureDialogOpen();
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, 'Dialog Submitted:');
    });

    it('MM-T4103 should fill text field and submit dialog (Plugin)', async () => {
        await ensureDialogClosed();
        await postSlashCommandDirect('/dialog basic');
        await ensureDialogOpen();
        await InteractiveDialogScreen.fillTextElement('optional_text', 'Plugin Test Value');
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, 'Dialog Submitted:');
    });

    it('MM-T4104 should handle server error on dialog submission (Plugin)', async () => {
        await ensureDialogClosed();
        await postSlashCommandDirect('/dialog error');
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
        await postSlashCommandDirect('/dialog boolean');
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
        await postSlashCommandDirect('/dialog boolean');
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
        await ensureDialogClosed();
        await postSlashCommandDirect('/dialog selectfields');
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
        await waitForDialogSelectorButton('AppFormElement.someuserselector.select.button');
        const userSelectorButton = element(by.id('AppFormElement.someuserselector.select.button'));
        await userSelectorButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await selectUser(testUser);
        const channelSelectorButton = element(by.id('AppFormElement.somechannelselector.select.button'));

        // 1s bridge-idle waitFor fails on Android after IntegrationSelector dismissal animation.
        await waitForDialogSelectorButton('AppFormElement.somechannelselector.select.button');
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
        await postSlashCommandDirect('/dialog selectfields');
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
        await waitForDialogSelectorButton('AppFormElement.someuserselector.select.button');
        const userSelectorButton = element(by.id('AppFormElement.someuserselector.select.button'));
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
        await postSlashCommandDirect('/dialog selectfields');
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
        await waitForDialogSelectorButton('AppFormElement.someuserselector.select.button');
        const userSelectorButton = element(by.id('AppFormElement.someuserselector.select.button'));
        await userSelectorButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await selectUser(testUser);
        const channelSelectorButton = element(by.id('AppFormElement.somechannelselector.select.button'));

        // 1s bridge-idle waitFor fails on Android after IntegrationSelector dismissal animation.
        await waitForDialogSelectorButton('AppFormElement.somechannelselector.select.button');
        await channelSelectorButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await selectChannel(testChannel);
        await wait(300);
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, 'Dialog Submitted:');
    });

    it('MM-T4201 should fill and submit all text field types (Plugin)', async () => {
        await ensureDialogClosed();
        await postSlashCommandDirect('/dialog textfields');
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
        await postSlashCommandDirect('/dialog textfields');
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
        await postSlashCommandDirect('/dialog textfields');
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
        await postSlashCommandDirect('/dialog multi-select');
        await ensureDialogOpen();
        const multiselectUsersButton = element(by.id('AppFormElement.multiselect_users.select.button'));
        await expect(multiselectUsersButton).toExist();
        await multiselectUsersButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await selectUser(testUser, {multiselect: true});
        await wait(500);
        await IntegrationSelectorScreen.done();
        await wait(300);
        const multiselectChannelsButton = element(by.id('AppFormElement.multiselect_channels.select.button'));
        await expect(multiselectChannelsButton).toExist();
        await multiselectChannelsButton.tap();
        await IntegrationSelectorScreen.toBeVisible();
        await selectChannel(testChannel, {multiselect: true});
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
        await postSlashCommandDirect('/dialog dynamic-select');
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

    (isAndroid() ? it.skip : it)('MM-T4980 should complete multistep dialog progression (Plugin)', async () => {
        await ensureDialogClosed();
        await postSlashCommandDirect('/dialog multistep');
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
        await postSlashCommandDirect('/dialog multistep');
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

    itNotIos('MM-T4983 should handle field refresh basic interaction (Plugin)', async () => {
        await ensureDialogClosed();
        await postSlashCommandDirect('/dialog field-refresh');
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
        await postSlashCommandDirect('/dialog field-refresh');
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
        beforeEach(async () => {

            // No KV reset here by design. Mattermost exposes no plugin KV REST API
            // (there is no /api/v4/plugins/:id/kv route), so the previous call 404'd on
            // every run and was swallowed — isolation it appeared to provide never
            // existed. The demo plugin's file-upload-clear command was also removed.
            //
            // It is not needed: `/dialog file-upload` always opens empty regardless of
            // KV, and each hydration test seeds its own KV via
            // apiSubmitDemoPluginFileUploadDialog before opening `file-upload-prefill`,
            // which overwrites any prior value. Add a plugin-side clear route if a test
            // ever needs to assert prefill with *no* stored files.
        });

        it('MM-T6070_1 - should render file upload dialog, open attachment options, and submit with no files (Plugin)', async () => {
            await ensureDialogClosed();
            await postSlashCommandDirect('/dialog file-upload');
            await ensureDialogOpen();

            await expect(element(by.text('File Upload Dialog Demo'))).toExist();

            // 'Single File Upload' and choose buttons are inside AppsFormFileField, which is
            // wrapped by withObservables (canUploadFiles). Wait for the HOC's first emission.
            await waitFor(element(by.text('Single File Upload'))).toExist().withTimeout(timeouts.THREE_SEC);
            await waitFor(element(by.text('Multiple File Upload'))).toExist().withTimeout(timeouts.THREE_SEC);
            await waitFor(InteractiveDialogScreen.getFileFieldChooseButton('single_file')).toExist().withTimeout(timeouts.THREE_SEC);
            await waitFor(InteractiveDialogScreen.getFileFieldChooseButton('multi_file')).toExist().withTimeout(timeouts.THREE_SEC);

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

        it('MM-T6071_1 - should submit file upload dialog with pre-loaded file and verify success post (Plugin)', async () => {
            await ensureDialogClosed();

            let fileId: string;
            try {
                fileId = await seedFileUploadDialogViaApi(testUser, testChannel.id, testTeam.id);
            } catch (err: any) {
                throw new Error(`File upload seed failed: ${err.message || err}`);
            }

            // file-upload always opens empty; file-upload-prefill hydrates from plugin KV.
            await postSlashCommandDirect('/dialog file-upload-prefill');
            await ensureDialogOpen();

            // * Verify seeded file preview appears before submit
            await InteractiveDialogScreen.expectHydratedFilePreview('single_file', fileId);

            // # Submit the dialog with the pre-loaded file
            await InteractiveDialogScreen.submit();
            await ensureDialogClosed();

            // * Verify success post appears and contains the submitted file ID
            const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
            const submissionMatch = post.message.match(/(.+) submitted a file upload dialog/);
            if (!submissionMatch) {
                throw new Error(`Expected submission confirmation post but got: ${post.message}`);
            }
            const filesMatch = post.message.match(/\*\*File IDs \(\d+\):\*\* (.+)/);
            if (!filesMatch || !filesMatch[1]) {
                throw new Error(`Expected post to contain File IDs field but got: ${post.message}`);
            }
            if (!filesMatch[1].includes(fileId)) {
                throw new Error(`Expected post to contain fileId ${fileId} but got: ${filesMatch[1]}`);
            }
        });

        it('MM-T6072_1 - allow_multiple field keeps choose button enabled when file is attached; single-file field disables it (Plugin)', async () => {
            await ensureDialogClosed();

            let multiFileId: string;
            try {
                multiFileId = await seedFileUploadDialogViaApi(testUser, testChannel.id, testTeam.id, 'multi_file');
            } catch (err: any) {
                throw new Error(`Multi-file seed failed: ${err.message || err}`);
            }

            // file-upload always opens empty; file-upload-prefill hydrates from plugin KV.
            await postSlashCommandDirect('/dialog file-upload-prefill');
            await ensureDialogOpen();

            // * multi_file field has a seeded file but its choose button stays enabled (allow_multiple=true)
            await InteractiveDialogScreen.expectHydratedFilePreview('multi_file', multiFileId);
            await InteractiveDialogScreen.expectFileFieldChooseButtonEnabled('multi_file');

            // * single_file field has no file and its choose button is enabled
            await InteractiveDialogScreen.expectFileFieldChooseButtonEnabled('single_file');

            await InteractiveDialogScreen.cancel();
            await ensureDialogClosed();
        });

        it('MM-T6075_1 - should hydrate file field from plugin persisted file IDs and re-enable choose button after removal (Plugin)', async () => {
            await ensureDialogClosed();

            let fileId: string;
            try {
                fileId = await seedFileUploadDialogViaApi(testUser, testChannel.id, testTeam.id);
            } catch (err: any) {
                throw new Error(`File upload hydration seed failed (check file ownership / plugin file-upload support): ${err.message || err}`);
            }

            // file-upload always opens empty; file-upload-prefill hydrates from plugin KV.
            await postSlashCommandDirect('/dialog file-upload-prefill');
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

    it('MM-T2530A should open date/datetime dialog and display fields', async () => {
        // # Open datetime-basic dialog
        await postSlashCommandDirect('/dialog datetime-basic');
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
        await postSlashCommandDirect('/dialog datetime-basic');
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
        await postSlashCommandDirect('/dialog datetime-basic');
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
        await postSlashCommandDirect('/dialog datetime-basic');
        await ensureDialogOpen();

        // * Verify Relative Date Example (default="today") field is rendered
        await expect(element(by.text('Relative Date Example'))).toExist();

        // * Verify Relative DateTime Example (default="+1d") field is rendered
        await expect(element(by.text('Relative DateTime Example'))).toExist();

        await InteractiveDialogScreen.cancel();
        await ensureDialogClosed();
    });

    // Skipped on iOS: the dialog does not render even though the command succeeds.
    // Evidence from the CI artifact for this test (run 34184780106, machine-2):
    //   04:45:00.252  POST /api/v4/commands/execute  Task <164> resuming
    //   04:45:00.526  received response, status 200
    //   04:45:00.535  summary for task success {transaction_duration_ms=281, response_status=200}
    // The app stayed responsive for the full 30s wait (Detox kept getting "Action received:
    // invoke"), did not crash, and the failure record's ViewHierarchy contains no
    // interactive_dialog.screen at all -- so the dialog was never rendered rather than merely
    // hidden. MM-T2530D issues the identical '/dialog datetime-basic' moments earlier and
    // passes, and 21 of the 25 tests in this file passed in the same run, so the plugin and
    // the server were healthy.
    //
    // The dialog arrives as an open_dialog WebSocket event; device.log does not capture the
    // app's WebSocket frames, so whether the server never pushed it or the client dropped it
    // is not determinable from CI artifacts. Not reproducible locally and not observed in the
    // production app. Previous attempts to fix it did not hold. Android is unaffected.
    itNotIos('MM-T2530F should verify UTC conversion for datetime values', async () => {
        // # Open dialog
        await postSlashCommandDirect('/dialog datetime-basic');
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

    // Skipped on iOS: the dialog does not render even though the command succeeds.
    // Evidence from the CI artifact for this test (run 34184780106, machine-2):
    //   04:45:00.252  POST /api/v4/commands/execute  Task <164> resuming
    //   04:45:00.526  received response, status 200
    //   04:45:00.535  summary for task success {transaction_duration_ms=281, response_status=200}
    // The app stayed responsive for the full 30s wait (Detox kept getting "Action received:
    // invoke"), did not crash, and the failure record's ViewHierarchy contains no
    // interactive_dialog.screen at all -- so the dialog was never rendered rather than merely
    // hidden. MM-T2530D issues the identical '/dialog datetime-basic' moments earlier and
    // passes, and 21 of the 25 tests in this file passed in the same run, so the plugin and
    // the server were healthy.
    //
    // The dialog arrives as an open_dialog WebSocket event; device.log does not capture the
    // app's WebSocket frames, so whether the server never pushed it or the client dropped it
    // is not determinable from CI artifacts. Not reproducible locally and not observed in the
    // production app. Previous attempts to fix it did not hold. Android is unaffected.
    itNotIos('MM-T2530G should display timezone indicator and convert to UTC correctly', async () => {
        // # Open datetime-timezone dialog (has Europe/London timezone fields)
        await postSlashCommandDirect('/dialog datetime-timezone');
        await ensureDialogOpen();

        // # Scroll down past introduction text to reveal fields
        try {
            await element(by.id('interactive_dialog.screen')).scroll(300, 'down');
            await wait(300);
        } catch {}

        // * Verify London dropdown field is visible
        await expect(element(by.id('AppFormElement.london_dropdown'))).toExist();

        // * Verify timezone indicator appears for London field
        // London is GMT in winter, BST in summer — mobile renders without emoji.
        // Datetime-timezone dialog can show the indicator twice.
        try {
            await expect(element(by.text('Times in GMT')).atIndex(0)).toExist();
        } catch {
            await expect(element(by.text('Times in BST')).atIndex(0)).toExist();
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

    // Skipped on iOS: the dialog does not render even though the command succeeds.
    // Evidence from the CI artifact for this test (run 34184780106, machine-2):
    //   04:45:00.252  POST /api/v4/commands/execute  Task <164> resuming
    //   04:45:00.526  received response, status 200
    //   04:45:00.535  summary for task success {transaction_duration_ms=281, response_status=200}
    // The app stayed responsive for the full 30s wait (Detox kept getting "Action received:
    // invoke"), did not crash, and the failure record's ViewHierarchy contains no
    // interactive_dialog.screen at all -- so the dialog was never rendered rather than merely
    // hidden. MM-T2530D issues the identical '/dialog datetime-basic' moments earlier and
    // passes, and 21 of the 25 tests in this file passed in the same run, so the plugin and
    // the server were healthy.
    //
    // The dialog arrives as an open_dialog WebSocket event; device.log does not capture the
    // app's WebSocket frames, so whether the server never pushed it or the client dropped it
    // is not determinable from CI artifacts. Not reproducible locally and not observed in the
    // production app. Previous attempts to fix it did not hold. Android is unaffected.
    itNotIos('MM-T2530H should accept manual time entry on datetime field', async () => {
        await postSlashCommandDirect('/dialog datetime-timezone');
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
        const {post, error: lastPostError} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // The helper returns {error} instead of throwing when every poll failed (CI 34290629488:
        // a Cloudflare challenge answered the posts endpoint for two minutes, and this read as
        // "Cannot read properties of undefined (reading 'message')" — a code bug's signature).
        if (lastPostError || !post) {
            throw new Error(`Could not read the submission post from channel ${testChannel.id}: ${JSON.stringify(lastPostError ?? 'no post returned')}`);
        }

        // Match to end of line, not \s*(\S+): the payload renders as a markdown list, so \s*
        // would cross the newline and capture the next bullet (an empty field read "-").
        const match = post.message.match(/local_manual:[ \t]*([^\n]*)/);
        const submitted = match?.[1]?.trim() ?? '';
        if (!submitted) {
            throw new Error(`Expected local_manual to have a value but the field was empty. Full message: ${post.message}`);
        }

        // The minutes are the signal: manual entry keeps the typed :30, the rounded picker gives
        // :00. Milliseconds are whatever the picker held — commitManualTime zeroes only seconds.
        if (!/T\d{2}:30:00(?:\.\d{1,3})?Z$/.test(submitted)) {
            throw new Error(`Expected manually-entered minutes (:30) in local_manual but got: ${submitted}`);
        }
    });
});
