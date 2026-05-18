// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    Setup,
    System,
    User,
    Webhook,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
    webhookBaseUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    ChannelScreen,
    LoginScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

export class MmBlocksTestHelper {
    static readonly SERVER_DISPLAY_NAME = 'Server 1';
    static readonly CHANNELS_CATEGORY = 'channels';
    static readonly WEBHOOK_BASE_URL = webhookBaseUrl;
    static readonly ONLY_VISIBLE_TO_YOU = '(Only visible to you)';

    static async enableMmBlocks(baseUrl: string): Promise<void> {
        await User.apiAdminLogin(baseUrl);
        await System.apiUpdateConfig(baseUrl, {
            FeatureFlags: {
                MmBlocksEnabled: true,
            },
        });
    }

    static async requireWebhookSidecar(): Promise<void> {
        await Webhook.requireWebhookServer(this.WEBHOOK_BASE_URL);
    }

    static isWebhookSidecarReachable(): Promise<boolean> {
        return Webhook.isWebhookTestServerReachable(this.WEBHOOK_BASE_URL);
    }

    static integrationUrl(path: string): string {
        return `${this.WEBHOOK_BASE_URL}${path}`;
    }

    static async setupChannelTest(): Promise<{channel: any; team: any; user: any}> {
        await this.enableMmBlocks(siteOneUrl);
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);

        await ServerScreen.connectToServer(serverOneUrl, this.SERVER_DISPLAY_NAME);
        await LoginScreen.login(user);
        await ChannelListScreen.toBeVisible();
        await ChannelScreen.open(this.CHANNELS_CATEGORY, channel.name);

        return {channel, team, user};
    }

    static async waitForPostText(text: string, timeout = timeouts.TEN_SEC): Promise<void> {
        await waitFor(element(by.text(text))).toExist().withTimeout(timeout);
    }

    static async expectOnlyVisibleToYou(): Promise<void> {
        await expect(element(by.text(this.ONLY_VISIBLE_TO_YOU))).toExist();
    }

    static async tapMmBlocksButton(actionId: string): Promise<void> {
        const button = element(by.id(`mm_blocks.button.${actionId}`));
        await waitFor(button).toExist().withTimeout(timeouts.TEN_SEC);
        await button.tap();
        await wait(timeouts.TWO_SEC);
    }

    static async openThreadForPost(postId: string, postMessage: string): Promise<void> {
        await ChannelScreen.openReplyThreadFor(postId, postMessage);
        await ThreadScreen.toBeVisible();
    }

    static randomMarker(prefix: string): string {
        return `${prefix} ${getRandomId()}`;
    }
}
