// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// E2E tests for Share with connected workspaces
// Navigation: Channel → Channel Info → Channel Settings → Configuration → Share with connected workspaces
//
// Requirements for "Share with connected workspaces" to be visible:
// - Server license must include Shared Channels (license.SharedChannels === 'true').
//   The server only sends ExperimentalSharedChannels to the client when license.HasSharedChannels().
// - Config: ConnectedWorkspacesSettings.EnableSharedChannels = true (server struct; client sees ExperimentalSharedChannels).
// - User must have MANAGE_SHARED_CHANNELS (e.g. system_admin role).
// - Channel must be a public/private channel (not DM/GM).
// *******************************************************************

import {Channel, Setup, System, User} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import Alert from '@support/ui/component/alert';
import {
    ChannelConfigurationScreen,
    ChannelInfoScreen,
    ChannelScreen,
    ChannelSettingsScreen,
    LoginScreen,
    ServerScreen,
    HomeScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect, device, element, by, waitFor} from 'detox';

describe('Share with connected workspaces', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testUser: any;
    let testTeam: any;
    let testChannel: any;
    let sharedChannelsAvailable = false;

    const channelShareScreen = element(by.id('channel_share.screen'));
    const channelShareToggle = element(by.id('channel_share.toggle'));
    const channelShareToggleOn = element(by.id('channel_share.toggle.toggled.true.button'));
    const channelShareToggleOff = element(by.id('channel_share.toggle.toggled.false.button'));

    const isElementVisible = async (el: Detox.NativeElement, timeoutMs = 2000): Promise<boolean> => {
        try {
            await waitFor(el).toBeVisible().withTimeout(timeoutMs);
            return true;
        } catch {
            return false;
        }
    };

    // Tap the RNN back button N times to unwind from nested screens (Configuration, Share, etc.).
    // The Channel Info screen uses a close button (close.channel_info.button), not screen.back.button.
    // When unwinding all the way to the channel, pass channelInfoCloseButtonId so the last tap uses it.
    const tapBackButton = async (times: number, lastButtonId?: string) => {
        const backButton = element(by.id('screen.back.button'));
        const backTaps = lastButtonId ? times - 1 : times;
        await Array.from({length: backTaps}).reduce(
            (p: Promise<void>) => p.then(() => backButton.tap()).then(() => wait(timeouts.ONE_SEC)),
            Promise.resolve(),
        );
        if (lastButtonId) {
            await element(by.id(lastButtonId)).tap();
            await wait(timeouts.ONE_SEC);
        }
    };

    const channelInfoCloseButtonId = 'close.channel_info.button';

    beforeAll(async () => {
        const {user, channel, team} = await Setup.apiInit(siteOneUrl);
        testUser = user;
        testChannel = channel;
        testTeam = team;

        await User.apiAdminLogin(siteOneUrl);
        const {license} = await System.apiGetClientLicense(siteOneUrl);
        sharedChannelsAvailable = license?.SharedChannels === 'true';

        // Enable autotranslation so the Configuration option is always visible in Channel Settings
        // (required when shared channels is disabled, e.g. TC-MOB-02).
        await System.apiPatchConfig(siteOneUrl, {
            AutoTranslationSettings: {
                Enable: true,
                Provider: 'libretranslate',
                TargetLanguages: ['es', 'en'],
                LibreTranslate: {
                    URL: 'https://example.com',
                },
            },
        });

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        await User.apiAdminLogin(siteOneUrl);
        await System.apiDeleteAllRemoteClusters(siteOneUrl);
        await System.apiPatchConfig(siteOneUrl, {
            AutoTranslationSettings: {
                Enable: false,
            },
            ConnectedWorkspacesSettings: {
                EnableSharedChannels: false,
                EnableRemoteClusterService: false,
            },
        });
        await HomeScreen.logout();
    });

    const navigateToConfiguration = async (channelName: string = testChannel.name) => {
        await ChannelScreen.open(channelsCategory, channelName);
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();
        await ChannelSettingsScreen.openConfiguration();
        await wait(timeouts.ONE_SEC);
    };

    const setSharedChannelsFeature = async (enabled: boolean) => {
        await User.apiAdminLogin(siteOneUrl);
        await System.apiPatchConfig(siteOneUrl, {
            ConnectedWorkspacesSettings: {EnableSharedChannels: enabled},
        });
    };

    const grantUserSystemAdminRole = async (userId: string) => {
        const {user} = await User.apiGetUserById(siteOneUrl, userId);
        if (!user) {
            throw new Error('grantUserSystemAdminRole: user not found');
        }
        const roles = (user.roles || 'system_user').trim();
        const newRoles = roles.includes('system_admin') ? roles : `${roles} system_admin`;
        await User.apiUpdateUserRoles(siteOneUrl, userId, newRoles);
    };

    const removeUserSystemAdminRole = async (userId: string) => {
        const {user} = await User.apiGetUserById(siteOneUrl, userId);
        if (!user) {
            throw new Error('removeUserSystemAdminRole: user not found');
        }
        const roles = (user.roles || 'system_user').trim();
        const newRoles = roles.replace('system_admin', '').trim();
        await User.apiUpdateUserRoles(siteOneUrl, userId, newRoles);
    };

    /** Admin session must be active on `client` (e.g. after setSharedChannelsFeature or apiAdminLogin). */
    const createOpenChannelForUserOnTestTeam = async (prefix: string) => {
        const created = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            type: 'O',
            prefix,
        });
        if (created.error) {
            throw new Error(`createOpenChannelForUserOnTestTeam: ${JSON.stringify(created.error)}`);
        }
        const added = await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, created.channel.id);
        if (added.error) {
            throw new Error(`createOpenChannelForUserOnTestTeam: ${JSON.stringify(added.error)}`);
        }
        return created.channel;
    };

    it('TC-MOB-01: Section visible when all conditions are met', async () => {
        if (!sharedChannelsAvailable) {
            return;
        }
        await setSharedChannelsFeature(true);
        await grantUserSystemAdminRole(testUser.id);
        await device.reloadReactNative();
        await wait(timeouts.THREE_SEC);

        await navigateToConfiguration();
        await ChannelConfigurationScreen.toBeVisible();

        await expect(ChannelConfigurationScreen.shareWithConnectedWorkspacesOption).toBeVisible();
        await ChannelConfigurationScreen.openShareWithConnectedWorkspaces();
        await waitFor(channelShareScreen).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(channelShareToggle).toBeVisible();
        await expect(channelShareToggleOff).toBeVisible();

        await tapBackButton(4, channelInfoCloseButtonId);
    });

    it('TC-MOB-02: Section hidden when feature disabled', async () => {
        if (!sharedChannelsAvailable) {
            return;
        }
        await setSharedChannelsFeature(false);
        await grantUserSystemAdminRole(testUser.id);
        await device.reloadReactNative();
        await wait(timeouts.THREE_SEC);

        await navigateToConfiguration();
        await ChannelConfigurationScreen.toBeVisible();

        await expect(ChannelConfigurationScreen.shareWithConnectedWorkspacesOption).not.toBeVisible();

        await tapBackButton(3, channelInfoCloseButtonId);
    });

    it('TC-MOB-03: No connected workspaces when no remotes exist', async () => {
        if (!sharedChannelsAvailable) {
            return;
        }
        await setSharedChannelsFeature(true);
        await System.apiDeleteAllRemoteClusters(siteOneUrl);
        await grantUserSystemAdminRole(testUser.id);
        await device.reloadReactNative();
        await wait(timeouts.THREE_SEC);

        await navigateToConfiguration();
        await ChannelConfigurationScreen.toBeVisible();

        await ChannelConfigurationScreen.openShareWithConnectedWorkspaces();
        await waitFor(channelShareScreen).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(channelShareToggle).toBeVisible();
        await expect(channelShareToggleOff).toBeVisible();
        await expect(element(by.id('channel_share.no_remotes_warning'))).toBeVisible();

        await tapBackButton(4, channelInfoCloseButtonId);
    });

    it('TC-MOB-04: Section hidden for users without Shared channel manager role', async () => {
        if (!sharedChannelsAvailable) {
            return;
        }
        await setSharedChannelsFeature(true);
        await removeUserSystemAdminRole(testUser.id);
        await device.reloadReactNative();
        await wait(timeouts.THREE_SEC);

        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();

        const configVisible = await isElementVisible(ChannelSettingsScreen.configurationOption);

        // Due to other potential configurations, config may or may not be visible.
        // We leave this condition here to be more robust in the future.
        if (configVisible) {
            await ChannelSettingsScreen.openConfiguration();
            await wait(timeouts.ONE_SEC);
            await expect(ChannelConfigurationScreen.shareWithConnectedWorkspacesOption).not.toBeVisible();
            await tapBackButton(1);
        }

        await tapBackButton(2, channelInfoCloseButtonId);
    });

    it('TC-MOB-06: Enable sharing toggle', async () => {
        if (!sharedChannelsAvailable) {
            return;
        }
        await setSharedChannelsFeature(true);
        await User.apiAdminLogin(siteOneUrl);
        await System.apiPatchConfig(siteOneUrl, {
            ConnectedWorkspacesSettings: {
                EnableSharedChannels: true,
                EnableRemoteClusterService: true,
            },
        });
        const shareTestChannel = await createOpenChannelForUserOnTestTeam('share-ws-mob06');
        const mobE2eRemote = {
            name: 'e2e_mob_connected_workspace',
            display_name: 'E2E MOB Connected Workspace',
            password: 'e2e-mob-connected-workspace-pwd',
        };
        await System.apiEnsureSingleRemoteCluster(siteOneUrl, testTeam.id, mobE2eRemote);
        await grantUserSystemAdminRole(testUser.id);
        await device.reloadReactNative();
        await wait(timeouts.THREE_SEC);

        await navigateToConfiguration(shareTestChannel.name);
        await ChannelConfigurationScreen.toBeVisible();
        await expect(ChannelConfigurationScreen.shareWithConnectedWorkspacesOption).toBeVisible();
        await ChannelConfigurationScreen.openShareWithConnectedWorkspaces();
        await waitFor(channelShareScreen).toBeVisible().withTimeout(timeouts.TEN_SEC);

        await expect(channelShareToggleOff).toBeVisible();
        await channelShareToggleOff.tap();
        await wait(timeouts.ONE_SEC);
        await expect(channelShareToggleOn).toBeVisible();

        const addWorkspaceButton = element(by.id('channel_share.add_workspace.button'));
        await waitFor(addWorkspaceButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await addWorkspaceButton.tap();
        await wait(timeouts.TWO_SEC);
        await element(by.text(mobE2eRemote.display_name)).tap();
        await wait(timeouts.ONE_SEC);
        await expect(element(by.text('Pending save'))).toBeVisible();

        const saveShareButton = element(by.id('channel_share.save.button'));
        await waitFor(saveShareButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await saveShareButton.tap();
        await wait(timeouts.TWO_SEC);
        await expect(element(by.text('Pending save'))).not.toBeVisible();

        // Since we are not confirming the remote cluster, it will be in a pending state.
        await expect(element(by.text('Connection pending'))).toBeVisible();

        await tapBackButton(4, channelInfoCloseButtonId);
    });

    it('TC-MOB-07: Disable sharing toggle', async () => {
        if (!sharedChannelsAvailable) {
            return;
        }

        await setSharedChannelsFeature(true);
        await User.apiAdminLogin(siteOneUrl);
        const mobE2eRemote = {
            name: 'e2e_mob_connected_workspace',
            display_name: 'E2E MOB Connected Workspace',
            password: 'e2e-mob-connected-workspace-pwd',
        };
        await System.apiEnsureSingleRemoteCluster(siteOneUrl, testTeam.id, mobE2eRemote);
        const shareTestChannel = await createOpenChannelForUserOnTestTeam('share-ws-mob07');
        const remotesRes = await System.apiGetRemoteClusters(siteOneUrl, {
            onlyConfirmed: true,
            excludePlugins: true,
        });
        if (remotesRes.error || remotesRes.status != null) {
            throw new Error(
                `TC-MOB-07: apiGetRemoteClusters failed siteUrl=${siteOneUrl} status=${String(remotesRes.status)} error=${JSON.stringify(remotesRes.error)}`,
            );
        }
        const firstRemote = remotesRes.remotes?.[0];
        if (!firstRemote) {
            throw new Error('TC-MOB-07: Expected at least one remote cluster after setup');
        }
        const shareRes = await Channel.apiShareChannelWithRemote(
            siteOneUrl,
            shareTestChannel.id,
            firstRemote.remote_id,
        );
        if (shareRes.error || shareRes.status != null) {
            throw new Error(
                `TC-MOB-07: apiShareChannelWithRemote failed siteUrl=${siteOneUrl} channelId=${shareTestChannel.id} remoteId=${firstRemote.remote_id} status=${String(shareRes.status)} error=${JSON.stringify(shareRes.error)}`,
            );
        }

        await grantUserSystemAdminRole(testUser.id);
        await device.reloadReactNative();
        await wait(timeouts.THREE_SEC);

        await navigateToConfiguration(shareTestChannel.name);
        await ChannelConfigurationScreen.openShareWithConnectedWorkspaces();
        await waitFor(channelShareScreen).toBeVisible().withTimeout(timeouts.TEN_SEC);

        await expect(channelShareToggleOn).toBeVisible();
        await channelShareToggleOn.tap();
        await wait(timeouts.ONE_SEC);
        await expect(channelShareToggleOff).toBeVisible();

        const saveShareButton = element(by.id('channel_share.save.button'));
        await waitFor(saveShareButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await saveShareButton.tap();
        await wait(timeouts.ONE_SEC);
        await waitFor(Alert.saveButton).toExist().withTimeout(timeouts.TEN_SEC);
        await Alert.saveButton.tap();
        await wait(timeouts.ONE_SEC);
        await expect(channelShareToggleOff).toBeVisible();

        await tapBackButton(4, channelInfoCloseButtonId);
    });
});
