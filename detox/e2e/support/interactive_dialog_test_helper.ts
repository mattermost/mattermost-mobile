// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    Command,
    Setup,
    Webhook,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    ChannelScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';

export class InteractiveDialogTestHelper {
    static readonly SERVER_DISPLAY_NAME = 'Server 1';
    static readonly WEBHOOK_BASE_URL = 'http://localhost:3000';
    static readonly CHANNELS_CATEGORY = 'channels';
    static readonly STANDARD_WAIT_TIME = 500;

    static async setupInteractiveDialogTest(
        commandTrigger: string,
        commandUrl: string,
        commandDisplayName: string,
        commandDescription: string,
    ): Promise<{testChannel: any; testTeam: any; testUser: any}> {
        // # Ensure webhook server is running
        await Webhook.requireWebhookServer(this.WEBHOOK_BASE_URL);

        const {channel, team, user} = await Setup.apiInit(siteOneUrl);

        // # Create slash command for dialog testing
        const command = {
            team_id: team.id,
            trigger: commandTrigger,
            url: `${this.WEBHOOK_BASE_URL}/${commandUrl}`,
            method: 'P',
            username: 'testbot',
            display_name: commandDisplayName,
            description: commandDescription,
            auto_complete: true,
            auto_complete_desc: commandDescription,
            auto_complete_hint: `[trigger ${commandTrigger}]`,
        };

        await Command.apiCreateCommand(siteOneUrl, command);

        // # Login to server
        await ServerScreen.connectToServer(serverOneUrl, this.SERVER_DISPLAY_NAME);
        await LoginScreen.login(user);

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();

        // # Navigate to the test channel for all tests
        await ChannelScreen.open(this.CHANNELS_CATEGORY, channel.name);

        return {
            testChannel: channel,
            testTeam: team,
            testUser: user,
        };
    }
}
