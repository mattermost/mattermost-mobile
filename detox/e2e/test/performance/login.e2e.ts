// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import fs from 'fs';

import {Setup} from '@support/server_api';
import client from '@support/server_api/client';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {computeStatsFromData} from '@support/utils/statistics';

const N_RUNS = 10;
describe('Performance test', () => {
    let user: any;
    const serverOneDisplayName = 'Server 1';
    const times: Array<{prev: number; afterTap: number; after: number}> = [];

    beforeAll(async () => {
        const init = await Setup.apiInit(siteOneUrl);
        user = init.user;

        await ServerScreen.toBeVisible();
        await ServerScreen.serverUrlInput.replaceText(serverOneUrl);
        await ServerScreen.serverDisplayNameInput.replaceText(serverOneDisplayName);
        client.post(`${process.env.REACT_APP_PERFORMANCE_WEBHOOK}/start_measures`, {measureId: 'login'});
    });

    beforeEach(async () => {
        await ServerScreen.connectButton.tap();
        await LoginScreen.toBeVisible();
        await LoginScreen.usernameInput.replaceText(user.username);
        await LoginScreen.passwordInput.replaceText(user.password);
    });

    afterEach(async () => {
        await HomeScreen.logout();
    });

    afterAll(async () => {
        const res = await client.post(`${process.env.REACT_APP_PERFORMANCE_WEBHOOK}/finish_measures`, {measureId: 'login'});
        const calc = [];
        for (let i = 0; i < N_RUNS; i++) {
            calc.push({
                total: times[i]!.after - res.data.measures.start[i],
                totalDevice: res.data.measures.end[i] - res.data.measures.start[i],
                testDelay: res.data.measures.start[i] - times[i]!.prev,
                tapDelay: times[i]!.afterTap - times[i]!.prev,
                testTotal: times[i]!.after - times[i]!.prev,
                testAfterTap: times[i]!.after - times[i]!.afterTap,
            });
        }

        const baselineAverage = 564.8;
        const baselineQuasivariance = 27111.73;
        const baselineN = 10;

        const totals = calc.map((v) => v.totalDevice);
        const {average, quasiVariance, T, alpha, pass} = computeStatsFromData(totals, {av: baselineAverage, s: baselineQuasivariance, n: baselineN}, 0.10);

        fs.writeFileSync(
            `${process.env.REACT_APP_PERFORMANCE_OUTPUT}/perfTextResults.txt`,
            JSON.stringify({local: times, remote: res.data, calc, stats: {average, quasiVariance, alpha, T, pass}}),
        );
    });

    for (let i = 0; i < N_RUNS; i++) {
        it(`name ${i}`, async () => {
            const prev = Date.now();
            await LoginScreen.signinButton.tap();
            const afterTap = Date.now();
            await waitFor(HomeScreen.accountTab).toBeVisible().withTimeout(50000);
            const after = Date.now();
            times.push({prev, afterTap, after});
        });
    }
});
