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
    getCustomAttributeInputByName,
    probeUserAttributesProvision,
    scrollProfileAttributeIntoView,
    seedUserAttributeValues,
    USER_ATTRIBUTE_FIELD_NAMES,
    waitForEditProfileCustomAttributes,
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

        // Prior describes in this shard log in before provision enables
        // FeatureFlagCustomProfileAttributes — relaunch so login picks up the flag.
        await device.launchApp({
            newInstance: true,
            ...(device.getPlatform() === 'ios' ? {permissions: {notifications: 'YES'}} : {}),
        });
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await ChannelListScreen.waitForSidebarPublicChannelDisplayNameVisible(testChannel.name);

        // Reload so client config + custom profile fields sync after the flag was enabled.
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();

        const refreshed = await probeUserAttributesProvision(siteOneUrl);
        if (refreshed.ready) {
            fieldIds = refreshed.fieldIds;
        }
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
        await AccountScreen.open();
        await EditProfileScreen.open();
        await EditProfileScreen.toBeVisible();
        await waitForEditProfileCustomAttributes();

        if (isAndroid()) {
            const fillField = async (fieldName: typeof USER_ATTRIBUTE_FIELD_NAMES[number], value: string, scrollAmount: number) => {
                const input = getCustomAttributeInputByName(fieldName);
                await waitFor(input).
                    toBeVisible().
                    whileElement(by.id(EditProfileScreen.testID.scrollView)).
                    scroll(scrollAmount, 'down');
                await input.tap();
                await input.clearText();
                await input.replaceText(value);
            };
            await fillField(USER_ATTRIBUTE_FIELD_NAMES[0], attrValue1, 300);
            await fillField(USER_ATTRIBUTE_FIELD_NAMES[1], attrValue2, 200);
            await fillField(USER_ATTRIBUTE_FIELD_NAMES[2], attrValue3, 200);
        } else {
            const bioInput = getCustomAttributeInputByName(USER_ATTRIBUTE_FIELD_NAMES[0]);
            const deptInput = getCustomAttributeInputByName(USER_ATTRIBUTE_FIELD_NAMES[1]);
            const teamInput = getCustomAttributeInputByName(USER_ATTRIBUTE_FIELD_NAMES[2]);

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

        const profileList = by.id('user_profile.custom_attributes.list');
        await scrollProfileAttributeIntoView(USER_ATTRIBUTE_FIELD_NAMES[0]);
        await expect(element(by.text(USER_ATTRIBUTE_FIELD_NAMES[0]).withAncestor(profileList))).toExist();
        await expect(element(by.text(attrValue1).withAncestor(profileList))).toExist();

        await scrollProfileAttributeIntoView(USER_ATTRIBUTE_FIELD_NAMES[1]);
        await expect(element(by.text(USER_ATTRIBUTE_FIELD_NAMES[1]).withAncestor(profileList))).toExist();
        await expect(element(by.text(attrValue2).withAncestor(profileList))).toExist();

        await scrollProfileAttributeIntoView(USER_ATTRIBUTE_FIELD_NAMES[2]);
        await expect(element(by.text(USER_ATTRIBUTE_FIELD_NAMES[2]).withAncestor(profileList))).toExist();
        await expect(element(by.text(attrValue3).withAncestor(profileList))).toExist();

        await UserProfileScreen.close();
        await ChannelScreen.back();
    });
});
