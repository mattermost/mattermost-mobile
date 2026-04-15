// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    AccessControl,
    Channel,
    Post,
    Setup,
    System,
    Team,
    User,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts} from '@support/utils';
import {expect} from 'detox';

/**
 * Safely extracts a human-readable message from an unknown error payload.
 * getResponseFromError() returns {error: data, status} where data may be a
 * string, an object with a message field, or any other shape.
 */
const getErrorMessage = (err: unknown): string => {
    if (typeof err === 'string') {
        return err;
    }
    if (err && typeof err === 'object' && 'message' in err && typeof (err as Record<string, unknown>).message === 'string') {
        return (err as {message: string}).message;
    }
    try {
        return JSON.stringify(err);
    } catch {
        return String(err);
    }
};

describe('Messaging - Redacted Files Placeholder (ABAC)', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let deniedUser: any;
    let createdPolicyId: string | null = null;

    beforeAll(async () => {
        // # Require Enterprise license (ABAC is an enterprise feature)
        await System.apiRequireLicense(siteOneUrl);

        // # Set up base test data: team, channel, admin user
        const {channel, team, user: adminUser} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

        // # Create a second user (will be denied download access via policy)
        ({user: deniedUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'denied'}));
        await Team.apiAddUserToTeam(siteOneUrl, deniedUser.id, team.id);
        await Channel.apiAddUserToChannel(siteOneUrl, deniedUser.id, testChannel.id);

        // # Upload a file as admin and create a post with that file
        const {fileId, error: uploadError} = await AccessControl.apiUploadFileToChannel(
            siteOneUrl,
            testChannel.id,
            'test_attachment.txt',
            `ABAC redacted files test - ${getRandomId()}`,
        );
        if (uploadError) {
            throw new Error(`File upload failed: ${getErrorMessage(uploadError)}`);
        }

        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: 'Post with attached file',
            fileIds: [fileId],
            userId: adminUser.id,
        } as any);

        // # Enable ABAC
        const {error: enableError} = await AccessControl.apiEnableABAC(siteOneUrl);
        if (enableError) {
            throw new Error(`Failed to enable ABAC: ${getErrorMessage(enableError)}`);
        }

        // # Create a permission policy that denies file downloads for all users
        const policyName = `deny-download-${getRandomId()}`;
        const {policy, error: policyError} = await AccessControl.apiCreatePermissionPolicy(
            siteOneUrl,
            policyName,
            ['download_file_attachment'],
        );
        if (policyError) {
            throw new Error(`Failed to create permission policy: ${getErrorMessage(policyError)}`);
        }
        createdPolicyId = policy?.id ?? null;

        // # Log in to the server as the denied user
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(deniedUser);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();

        // # Clean up: delete the permission policy and disable ABAC
        if (createdPolicyId) {
            await AccessControl.apiDeletePermissionPolicy(siteOneUrl, createdPolicyId);
        }
        await AccessControl.apiDisableABAC(siteOneUrl);
    });

    it('MM-68219_1 - should show redacted files placeholder when download access is denied', async () => {
        // # Open the channel
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Verify the redacted files placeholder is visible on the post
        await waitFor(element(by.id('redacted-files-placeholder'))).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list
        await ChannelScreen.back();
    });
});

describe('Messaging - Files Visible Without ABAC Restriction', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
        // # Require Enterprise license
        await System.apiRequireLicense(siteOneUrl);

        // # Set up base test data
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

        // # Upload a file and post it
        const {fileId, error: uploadError} = await AccessControl.apiUploadFileToChannel(
            siteOneUrl,
            testChannel.id,
            'test_attachment.txt',
            `Visible file test - ${getRandomId()}`,
        );
        if (uploadError) {
            throw new Error(`File upload failed: ${getErrorMessage(uploadError)}`);
        }

        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: 'Post with attached file',
            fileIds: [fileId],
        } as any);

        // # Enable ABAC but do NOT create any deny policy (implicit allow)
        await AccessControl.apiEnableABAC(siteOneUrl);

        // # Log in as the normal user
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        await HomeScreen.logout();
        await AccessControl.apiDisableABAC(siteOneUrl);
    });

    it('MM-68219_2 - should not show redacted placeholder when no deny policy exists', async () => {
        // # Open the channel
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Verify the redacted files placeholder is not rendered (no policy = files accessible)
        await expect(element(by.id('redacted-files-placeholder'))).not.toExist();

        // # Go back to channel list
        await ChannelScreen.back();
    });
});
