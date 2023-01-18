// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import performance_baseline from '@support/performance_baseline';
import {Setup} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {checkWithBaseline} from '@support/utils/statistics';

const N_RUNS = 10;
describe('Performance test', () => {
    let user: any;
    const serverOneDisplayName = 'Server 1';
    const times: Array<{prev: number; after: number}> = [];

    beforeAll(async () => {
        device.disableSynchronization();
        const init = await Setup.apiInit(siteOneUrl);
        user = init.user;

        await ServerScreen.toBeVisible();
        await ServerScreen.serverUrlInput.replaceText(serverOneUrl);
        await ServerScreen.serverDisplayNameInput.replaceText(serverOneDisplayName);

        //client.post(`${process.env.REACT_APP_PERFORMANCE_WEBHOOK}/start_measures`, {measureId: 'login'});
    });

    beforeEach(async () => {
        await new Promise((r) => setTimeout(r, 1000));
        await waitFor(ServerScreen.connectButton).toBeVisible().withTimeout(500);
        await ServerScreen.connectButton.tap();
        await LoginScreen.toBeVisible();
        await LoginScreen.usernameInput.replaceText(user.username);
        await LoginScreen.passwordInput.replaceText(user.password);
    });

    afterEach(async () => {
        await HomeScreen.logout();
    });

    afterAll(async () => {
        device.enableSynchronization();
        const calc = [];
        for (let i = 0; i < N_RUNS; i++) {
            calc.push(times[i]!.after - times[i]!.prev);
        }

        checkWithBaseline(calc, performance_baseline.login);
    });

    for (let i = 0; i < N_RUNS; i++) {
        it(`name ${i}`, async () => {
            await waitFor(LoginScreen.signinButton).toBeVisible().withTimeout(500);
            const prev = Date.now();
            await LoginScreen.signinButton.tap();
            await waitFor(HomeScreen.accountTab).toBeVisible().withTimeout(50000);
            const after = Date.now();
            times.push({prev, after});
        });
    }
});
