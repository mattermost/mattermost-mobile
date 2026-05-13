// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {CustomProfileAttributes, Post, Setup, User} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {
    AccountScreen,
    ChannelListScreen,
    ChannelScreen,
    EditProfileScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    UserProfileScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Account - User Attributes', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';

    const attrValue1 = 'Mobile engineer';
    const attrValue2 = 'Engineering';
    const attrValue3 = 'Platform';

    let testUser: any;
    let testChannel: any;
    let createdFieldIds: string[] = [];
    let licenseAvailable = false;

    beforeAll(async () => {
        // # Login as admin to probe feature availability and create custom profile attribute fields
        await User.apiAdminLogin(siteOneUrl);

        // # Probe feature availability by attempting to create the first field.
        // If the API returns an error (e.g. 403/501), CustomProfileAttributes is unavailable — skip.
        const {field: field1, error: probeError} = await CustomProfileAttributes.apiCreateCustomProfileAttributeField(siteOneUrl, {name: 'Bio', type: 'text'});
        if (probeError) {
            return;
        }
        licenseAvailable = true;
        if (field1?.id) {
            createdFieldIds.push(field1.id);
        }

        // # Create remaining 2 custom profile attribute fields (text type)
        const {field: field2} = await CustomProfileAttributes.apiCreateCustomProfileAttributeField(siteOneUrl, {name: 'Department', type: 'text'});
        const {field: field3} = await CustomProfileAttributes.apiCreateCustomProfileAttributeField(siteOneUrl, {name: 'Team', type: 'text'});
        if (field2?.id) {
            createdFieldIds.push(field2.id);
        }
        if (field3?.id) {
            createdFieldIds.push(field3.id);
        }

        // # Set up test data: team, channel, user
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

        // # Log in to server as test user
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);

        // Ensure the channel has propagated to the sidebar before any test body runs.
        await ChannelListScreen.waitForSidebarPublicChannelDisplayNameVisible(testChannel.name);
    });

    beforeEach(async () => {
        // * Only verify channel list if license is available (beforeAll logged in)
        if (!licenseAvailable) {
            return;
        }
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Clean up: delete created custom profile attribute fields as admin
        if (createdFieldIds.length > 0) {
            await User.apiAdminLogin(siteOneUrl);
            await Promise.all(
                createdFieldIds.map((fieldId) =>
                    CustomProfileAttributes.apiDeleteCustomProfileAttributeField(siteOneUrl, fieldId),
                ),
            );
            createdFieldIds = [];
        }

        // # Log out only if the license was available and we logged in during beforeAll
        if (licenseAvailable) {
            await HomeScreen.logout();
        }
    });

    it('MM-T5781_1 - should display custom attribute fields in Edit Profile and allow saving values', async () => {
        // # Skip if license feature is unavailable or fields were not created
        if (!licenseAvailable || createdFieldIds.length < 3) {
            return;
        }

        // # Open Account screen then Edit Profile screen
        await AccountScreen.open();
        await EditProfileScreen.open();

        // * Verify edit profile screen is visible
        await EditProfileScreen.toBeVisible();

        // # Scroll to first custom attribute field, tap it, type value + '\n' to dismiss keyboard
        await waitFor(element(by.id(`edit_profile_form.customAttributes.${createdFieldIds[0]}`))).
            toBeVisible().
            whileElement(by.id(EditProfileScreen.testID.scrollView)).
            scroll(300, 'down');
        await element(by.id(`edit_profile_form.customAttributes.${createdFieldIds[0]}.input`)).tap();
        await element(by.id(`edit_profile_form.customAttributes.${createdFieldIds[0]}.input`)).typeText(`${attrValue1}\n`);

        // # Scroll to second attribute field, tap it, type value + '\n' to dismiss keyboard
        await waitFor(element(by.id(`edit_profile_form.customAttributes.${createdFieldIds[1]}`))).
            toBeVisible().
            whileElement(by.id(EditProfileScreen.testID.scrollView)).
            scroll(200, 'down');
        await element(by.id(`edit_profile_form.customAttributes.${createdFieldIds[1]}.input`)).tap();
        await element(by.id(`edit_profile_form.customAttributes.${createdFieldIds[1]}.input`)).typeText(`${attrValue2}\n`);

        // # Scroll to third attribute field, tap it, type value + '\n' to dismiss keyboard
        await waitFor(element(by.id(`edit_profile_form.customAttributes.${createdFieldIds[2]}`))).
            toBeVisible().
            whileElement(by.id(EditProfileScreen.testID.scrollView)).
            scroll(200, 'down');
        await element(by.id(`edit_profile_form.customAttributes.${createdFieldIds[2]}.input`)).tap();
        await element(by.id(`edit_profile_form.customAttributes.${createdFieldIds[2]}.input`)).typeText(`${attrValue3}\n`);

        // * Verify returned to account screen — '\n' on the last field triggers onFocusNextField
        // which calls submitUser() automatically (isLastEnabledField=true, canSave=true)
        await waitFor(AccountScreen.accountScreen).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list
        await ChannelListScreen.open();
    });

    it('MM-T5781_2 - should display user attribute values in profile pop-over when tapping on post username', async () => {
        // # Skip if license feature is unavailable or fields were not created
        if (!licenseAvailable || createdFieldIds.length < 3) {
            return;
        }

        // # Open test channel and post a message
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage('Checking user attributes');
        await wait(timeouts.ONE_SEC);

        // # Retrieve the post that was just created
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // # Tap on the display name in the post header to open the user profile pop-over
        const {postListPostItemHeaderDisplayName} = ChannelScreen.getPostListPostItem(post.id, 'Checking user attributes');
        await postListPostItemHeaderDisplayName.tap();
        await wait(timeouts.ONE_SEC);

        // * Verify user profile screen is visible
        await UserProfileScreen.toBeVisible();

        // * Verify first custom attribute (Bio) title and value are displayed in the correct order
        await waitFor(element(by.id(`custom_attribute.${createdFieldIds[0]}.title`))).
            toBeVisible().
            withTimeout(timeouts.TEN_SEC);
        await expect(element(by.id(`custom_attribute.${createdFieldIds[0]}.title`))).toBeVisible();
        await expect(element(by.id(`custom_attribute.${createdFieldIds[0]}.text`))).toHaveText(attrValue1);

        // * Verify second custom attribute (Department) title and value are displayed
        await expect(element(by.id(`custom_attribute.${createdFieldIds[1]}.title`))).toBeVisible();
        await expect(element(by.id(`custom_attribute.${createdFieldIds[1]}.text`))).toHaveText(attrValue2);

        // * Verify third custom attribute (Team) — swipe up on the options button (above the FlatList)
        // to trigger BottomSheet snap to 90%, making all custom attributes visible
        await element(by.id('user_profile_options.send_message.option')).swipe('up', 'fast', 0.8);
        await wait(timeouts.TWO_SEC);
        await waitFor(element(by.id(`custom_attribute.${createdFieldIds[2]}.title`))).
            toBeVisible().
            withTimeout(timeouts.TEN_SEC);
        await expect(element(by.id(`custom_attribute.${createdFieldIds[2]}.text`))).toHaveText(attrValue3);

        // # Close user profile pop-over
        await UserProfileScreen.close();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
