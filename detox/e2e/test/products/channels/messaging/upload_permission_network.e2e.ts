// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {assertAbacBaseline} from '@support/abac_test_helper';
import {AccessControl, Setup, System, Team, User} from '@support/server_api';
import {enableSessionAttribute} from '@support/session_attributes_test_helper';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isAndroid, isNetworkControlAvailable, setAndroidWifiEnabled, timeouts} from '@support/utils';
import {device, expect, waitFor} from 'detox';

// The network type is switched by turning the emulator's Wi-Fi off and back on, which an iOS
// simulator cannot do: it shares the host's network.
const canSwitchNetwork = isAndroid() && isNetworkControlAvailable(serverOneUrl);

(canSwitchNetwork ? describe : describe.skip)('Messaging - Upload Permission by Device Network (ABAC session attributes)', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';

    // Far longer than the test, so the app never resends the network type because its ttl ran
    // out: only the reset on a network change can get the new value to the server in time.
    const NETWORK_TYPE_TTL_SECONDS = 3600;

    // Well under the 5 minutes a render-time decision lives, so the button can only change
    // because the app reacted to the network change.
    const NETWORK_CHANGE_TIMEOUT = timeouts.HALF_MIN;

    let testChannel: any;
    let testTeam: any;
    let testUser: any;
    let permissionPolicyId: string | null = null;
    let restoreNetworkTypeAttribute: (() => Promise<void>) | undefined;

    beforeAll(async () => {
        await User.apiAdminLogin(siteOneUrl);

        // # Require an Enterprise Advanced license: below it the server ignores session attributes
        await System.apiRequireLicense(siteOneUrl);
        const {license} = await System.apiGetClientLicense(siteOneUrl);
        if (license?.SkuShortName !== 'advanced') {
            throw new Error(`Session attribute tests need an Enterprise Advanced license, got ${license?.SkuShortName}`);
        }
        await assertAbacBaseline(siteOneUrl);

        // # Have the app send its network type, and only every hour unless the network changes
        restoreNetworkTypeAttribute = await enableSessionAttribute(siteOneUrl, 'network_interface_type', {
            ttlSeconds: NETWORK_TYPE_TTL_SECONDS,
            gracePeriodSeconds: 0,
        });

        const {channel, team, user} = await Setup.apiInit(siteOneUrl, {channelOptions: {type: 'O', prefix: 'abac-network'}});
        testChannel = channel;
        testTeam = team;
        testUser = user;

        // # In this channel only, uploads are allowed on Wi-Fi and denied on any other network
        const {policy, error: policyError} = await AccessControl.apiCreateChannelPermissionPolicy(
            siteOneUrl,
            testChannel.id,
            [{
                name: 'abac-upload-network',
                role: 'channel_user',
                actions: ['upload_file_attachment'],
                expression: 'user.session.network_interface_type == "wifi"',
            }],
        );
        if (policyError) {
            throw new Error(`Failed to create permission policy: ${JSON.stringify(policyError)}`);
        }
        permissionPolicyId = policy?.id ?? null;

        const {error: activateError} = await AccessControl.apiSetPolicyActive(siteOneUrl, permissionPolicyId as string);
        if (activateError) {
            throw new Error(`Failed to activate permission policy: ${JSON.stringify(activateError)}`);
        }

        // # Start on Wi-Fi, then log in so the first decision is taken on it
        await setAndroidWifiEnabled(true, serverOneUrl);
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        // # Put the server back first: the device steps below throw when the app is unreachable,
        // and a server-wide attribute left enabled would leak into the next specs on this server
        if (permissionPolicyId) {
            await AccessControl.apiDeletePermissionPolicy(siteOneUrl, permissionPolicyId);
        }
        await restoreNetworkTypeAttribute?.();
        if (testTeam?.id) {
            await Team.apiDeleteTeam(siteOneUrl, testTeam.id);
        }

        // # Put the device back on Wi-Fi (adb only, so it works even if the app is gone), then log out
        await setAndroidWifiEnabled(true, serverOneUrl);
        await device.enableSynchronization();
        await HomeScreen.logout();
    });

    it('MM-71102_1 - should update the attachment button when the device switches between Wi-Fi and cellular', async () => {
        // # Open the channel on Wi-Fi
        await ChannelListScreen.toBeVisible();
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * The policy allows uploads on Wi-Fi
        await waitFor(ChannelScreen.attachmentAction).
            toExist().
            withTimeout(timeouts.TEN_SEC);

        // # Turn Wi-Fi off so the device falls back to cellular. Synchronization is off while the
        // network changes: the reconnecting WebSocket would keep Detox waiting otherwise.
        await device.disableSynchronization();
        await setAndroidWifiEnabled(false, serverOneUrl);

        // * The app asks again without reopening the channel and the policy now denies uploads
        await waitFor(ChannelScreen.attachmentActionDisabled).
            toExist().
            withTimeout(NETWORK_CHANGE_TIMEOUT);
        await expect(ChannelScreen.attachmentAction).not.toExist();

        // # Turn Wi-Fi back on
        await setAndroidWifiEnabled(true, serverOneUrl);

        // * Uploads are allowed again
        await waitFor(ChannelScreen.attachmentAction).
            toExist().
            withTimeout(NETWORK_CHANGE_TIMEOUT);
        await expect(ChannelScreen.attachmentActionDisabled).not.toExist();

        await device.enableSynchronization();
        await ChannelScreen.back();
    });
});
