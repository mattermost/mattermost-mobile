// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {Alert} from '@support/ui/component';
import {
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isIos, timeouts} from '@support/utils';
import {waitFor} from 'detox';

describe('Server Login - Base URL Redirect', () => {
    const serverDisplayName = 'Server 1';
    let channelPageUrl: string;

    beforeAll(async () => {
        const {channel, team} = await Setup.apiInit(siteOneUrl);
        channelPageUrl = `${serverOneUrl}/${team.name}/channels/${channel.name}`;
    });

    beforeEach(async () => {
        await ServerScreen.toBeVisible();
        await ServerScreen.serverUrlInput.clearText();
        await ServerScreen.serverDisplayNameInput.clearText();
    });

    // Skipping until the server is updated to return the base URL in the 406 response
    it.skip('MM-67557_1 - should rewrite server URL from 406 base_url response and connect', async () => {
        // # Connect using a channel page URL that returns HTML instead of the API
        await ServerScreen.serverUrlInput.replaceText(channelPageUrl);
        await ServerScreen.serverDisplayNameInput.replaceText(serverDisplayName);
        await ServerScreen.tapConnectButton();

        if (isIos() && !process.env.CI) {
            try {
                await waitFor(Alert.okayButton).toExist().withTimeout(timeouts.TEN_SEC);
                await Alert.okayButton.tap();
            } catch {
                // Push notification alert may not appear in local environments.
            }
        }

        // * Verify connection succeeds and login screen is shown
        await LoginScreen.toBeVisible();

        // # Go back to the server screen
        await LoginScreen.back();
        await ServerScreen.toBeVisible();

        // * Verify the server URL field shows the corrected base URL
        await ServerScreen.waitForServerUrl(serverOneUrl, timeouts.TEN_SEC);
    });
});
