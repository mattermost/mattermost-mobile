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
import {isAndroid, timeouts, wait} from '@support/utils';
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

        const fieldNames = ['Bio', 'Department', 'Team'];
        const {fields: existingFields, error: listError} = await CustomProfileAttributes.apiListCustomProfileAttributeFields(siteOneUrl);
        if (listError) {
            return;
        }

        const leaked = Array.isArray(existingFields) ? existingFields : [];
        await Promise.all(
            leaked.map((f: any) => CustomProfileAttributes.apiDeleteCustomProfileAttributeField(siteOneUrl, f.id)),
        );

        // # Create the three fields fresh. With leaked state cleared above, no
        // duplicate-key errors will fire.
        for (const name of fieldNames) {
            // eslint-disable-next-line no-await-in-loop -- sequential create keeps order deterministic
            const {field, error} = await CustomProfileAttributes.apiCreateCustomProfileAttributeField(siteOneUrl, {name, type: 'text'});
            if (error || !field?.id) {
                return; // licenseAvailable stays false → tests skip
            }
            createdFieldIds.push(field.id);
        }
        licenseAvailable = true;

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

        const fillField = async (fieldId: string | undefined, value: string, scrollAmount: number) => {
            if (!fieldId) {
                return;
            }
            const input = element(by.id(`edit_profile_form.customAttributes.${fieldId}.input`));
            await waitFor(input).
                toBeVisible().
                whileElement(by.id(EditProfileScreen.testID.scrollView)).
                scroll(scrollAmount, 'down');
            if (isAndroid()) {
                await input.tap();
                await input.clearText();
                await input.replaceText(value);
            } else {
                await input.replaceText(value);
            }
        };

        // # Scroll to and fill each custom attribute field
        await fillField(createdFieldIds[0], attrValue1, 300);
        await fillField(createdFieldIds[1], attrValue2, 200);
        await fillField(createdFieldIds[2], attrValue3, 200);

        await EditProfileScreen.saveButton.tap();

        // * Verify returned to account screen — submitUser() closes the modal.
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

        // # Expand the bottom sheet to its full height so all custom attributes are in the viewport
        await element(by.id('user_profile_options.send_message.option')).swipe('up', 'fast', 0.8);
        await wait(timeouts.TWO_SEC);

        // * Verify first custom attribute (Bio) title and value
        await waitFor(element(by.id(`custom_attribute.${createdFieldIds[0]}.title`))).
            toBeVisible().
            withTimeout(timeouts.TEN_SEC);
        await expect(element(by.id(`custom_attribute.${createdFieldIds[0]}.text`))).toHaveText(attrValue1);

        // * Verify second custom attribute (Department) title and value
        await waitFor(element(by.id(`custom_attribute.${createdFieldIds[1]}.title`))).
            toBeVisible().
            withTimeout(timeouts.TEN_SEC);
        await expect(element(by.id(`custom_attribute.${createdFieldIds[1]}.text`))).toHaveText(attrValue2);

        // * Verify third custom attribute (Team) — may require scrolling the sheet content
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
