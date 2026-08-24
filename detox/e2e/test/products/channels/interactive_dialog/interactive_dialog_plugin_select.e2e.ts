// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

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
    selectChannel,
    selectUser,
    setupInteractiveDialogPluginSuite,
    waitForDialogSelectorButton,
} from '@support/interactive_dialog_test_helper';
import {Post} from '@support/server_api';
import {siteOneUrl} from '@support/test_config';
import {
    ChannelScreen,
    IntegrationSelectorScreen,
    InteractiveDialogScreen,
} from '@support/ui/screen';
import {wait} from '@support/utils';
import {expect} from 'detox';

// MM-66558: dialog fields use replaceText instead of typeText.

describe('Interactive Dialog - Select (Plugin)', () => {
    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
        ({testChannel, testUser} = await setupInteractiveDialogPluginSuite());
    });

    afterAll(async () => {
        await logoutInteractiveDialogSuite();
    });

    afterEach(async () => {
        await cleanupInteractiveDialogAfterEach(testChannel);
    });

    // TODO: previously failed when selectUser tapped search-field text.
    it('MM-T4498 should open and handle interactive dialog with select fields (Plugin)', async () => {
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

    it('MM-T4976 should handle multiselect fields dialog (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog multi-select');
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
});
