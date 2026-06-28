// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Post, Setup} from '@support/server_api';
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
import {
    assertUserAttributesReady,
    probeUserAttributesProvision,
    seedUserAttributeValues,
    type UserAttributesFieldIds,
} from '@support/user_attributes_test_helper';
import {isAndroid, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Account - User Attributes', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';

    const attrValue1 = 'Mobile engineer';
    const attrValue2 = 'Engineering';
    const attrValue3 = 'Platform';

    let testUser: any;
    let testChannel: any;
    let fieldIds: UserAttributesFieldIds | undefined;
    let setupFailureReason: string | undefined;

    beforeAll(async () => {
        const provision = await probeUserAttributesProvision(siteOneUrl);
        if (!provision.ready) {
            setupFailureReason = provision.reason;
            return;
        }
        fieldIds = provision.fieldIds;

        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

        const seed = await seedUserAttributeValues(
            siteOneUrl,
            testUser,
            fieldIds,
            [attrValue1, attrValue2, attrValue3],
        );
        if (!seed.ok) {
            setupFailureReason = seed.reason;
            return;
        }

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await ChannelListScreen.waitForSidebarPublicChannelDisplayNameVisible(testChannel.name);
    });

    beforeEach(async () => {
        assertUserAttributesReady(setupFailureReason);
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        if (!setupFailureReason) {
            await HomeScreen.logout();
        }
    });

    it('MM-T5781_1 - should display custom attribute fields in Edit Profile and allow saving values', async () => {
        const [fieldId0, fieldId1, fieldId2] = fieldIds!;

        await AccountScreen.open();
        await EditProfileScreen.open();
        await wait(timeouts.TWO_SEC);
        await EditProfileScreen.toBeVisible();

        await waitFor(element(by.id(`edit_profile_form.customAttributes.${fieldId0}.input`))).
            toExist().
            withTimeout(timeouts.TEN_SEC);

        if (isAndroid()) {
            const fillField = async (fieldId: string, value: string, scrollAmount: number) => {
                const input = element(by.id(`edit_profile_form.customAttributes.${fieldId}.input`));
                await waitFor(input).
                    toBeVisible().
                    whileElement(by.id(EditProfileScreen.testID.scrollView)).
                    scroll(scrollAmount, 'down');
                await input.tap();
                await input.clearText();
                await input.replaceText(value);
            };
            await fillField(fieldId0, attrValue1, 300);
            await fillField(fieldId1, attrValue2, 200);
            await fillField(fieldId2, attrValue3, 200);
        } else {
            const bioInput = element(by.id(`edit_profile_form.customAttributes.${fieldId0}.input`));
            const deptInput = element(by.id(`edit_profile_form.customAttributes.${fieldId1}.input`));
            const teamInput = element(by.id(`edit_profile_form.customAttributes.${fieldId2}.input`));

            await waitFor(bioInput).
                toBeVisible().
                whileElement(by.id(EditProfileScreen.testID.scrollView)).
                scroll(300, 'down');
            await bioInput.tap();
            await bioInput.typeText(`${attrValue1}\n`);
            await deptInput.typeText(`${attrValue2}\n`);
            await teamInput.typeText(attrValue3);
        }

        await EditProfileScreen.saveButton.tap();
        await AccountScreen.toBeVisible();
        await ChannelListScreen.open();
    });

    it('MM-T5781_2 - should display user attribute values in profile pop-over when tapping on post username', async () => {
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage('Checking user attributes');
        await wait(timeouts.ONE_SEC);

        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItemHeaderDisplayName} = ChannelScreen.getPostListPostItem(post.id, 'Checking user attributes');
        await postListPostItemHeaderDisplayName.tap();
        await wait(timeouts.ONE_SEC);

        await UserProfileScreen.toBeVisible();
        await UserProfileScreen.sendMessageProfileOption.swipe('up', 'fast', 0.8);
        await wait(timeouts.TWO_SEC);

        await waitFor(element(by.id(`custom_attribute.${fieldIds![0]}.title`))).
            toExist().
            withTimeout(timeouts.TEN_SEC);
        await expect(element(by.id(`custom_attribute.${fieldIds![0]}.text`))).toHaveText(attrValue1);

        await waitFor(element(by.id(`custom_attribute.${fieldIds![1]}.title`))).
            toExist().
            withTimeout(timeouts.TEN_SEC);
        await expect(element(by.id(`custom_attribute.${fieldIds![1]}.text`))).toHaveText(attrValue2);

        await waitFor(element(by.id(`custom_attribute.${fieldIds![2]}.title`))).
            toExist().
            withTimeout(timeouts.TEN_SEC);
        await expect(element(by.id(`custom_attribute.${fieldIds![2]}.text`))).toHaveText(attrValue3);

        await UserProfileScreen.close();
        await ChannelScreen.back();
    });
});
