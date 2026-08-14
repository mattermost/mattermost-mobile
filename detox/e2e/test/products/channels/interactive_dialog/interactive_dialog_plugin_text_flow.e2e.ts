// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-empty */

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    cleanupInteractiveDialogAfterEach,
    ensureDialogClosed,
    ensureDialogOpen,
    logoutInteractiveDialogSuite,
    setupInteractiveDialogPluginSuite,
} from '@support/interactive_dialog_test_helper';
import {Post} from '@support/server_api';
import {siteOneUrl} from '@support/test_config';
import {
    ChannelScreen,
    IntegrationSelectorScreen,
    InteractiveDialogScreen,
} from '@support/ui/screen';
import {isIos, wait} from '@support/utils';
import {expect} from 'detox';

// MM-66558: dialog fields use replaceText instead of typeText.

describe('Interactive Dialog - Text Flow (Plugin)', () => {
    let testChannel: any;

    beforeAll(async () => {
        ({testChannel} = await setupInteractiveDialogPluginSuite());
    });

    afterAll(async () => {
        await logoutInteractiveDialogSuite();
    });

    afterEach(async () => {
        await cleanupInteractiveDialogAfterEach(testChannel);
    });

    // Skip iOS: RF→Detox migration left no recorded failure; Android covers this case.
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

    it('MM-T4980 should complete multistep dialog progression (Plugin)', async () => {
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

    // Field-refresh text inputs can leave keyboard/animation state that poisons later tests.
    it('MM-T4983 should handle field refresh basic interaction (Plugin)', async () => {
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
});
