// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import performance_baseline from '@support/performance_baseline';
import {Post, Setup} from '@support/server_api';
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
import {checkWithBaseline} from '@support/utils/statistics';

const loremIpsum = '![gif](https://media.giphy.com/media/aC45M5Q4D07Pq/giphy.gif) Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam sed mauris suscipit, tempor elit eu, fermentum urna. Nunc et venenatis risus. Morbi dignissim sit amet odio non condimentum. Etiam venenatis urna in est luctus, eget varius massa sodales. Nunc a fringilla libero. Sed molestie in massa eget dignissim. In ac lectus auctor, mattis enim at, fermentum metus. Integer et vehicula magna. Nulla id ex eget orci feugiat tincidunt vitae sit amet libero. Etiam lacinia est non purus lobortis, a dapibus sem fringilla.';

const N_RUNS = 10;
describe('Performance test', () => {
    let user: any;
    let testChannel: any;
    let post: any;
    let baseMatcher: any;
    const channelsCategory = 'channels';
    const serverOneDisplayName = 'Server 1';
    const times: Array<{prev: number; after: number}> = [];

    beforeAll(async () => {
        device.disableSynchronization();
        const init = await Setup.apiInit(siteOneUrl);
        user = init.user;
        testChannel = init.channel;

        for (let i = 0; i < 100; i++) {
            await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message: loremIpsum});
        }
        const res = await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message: 'foo'});
        post = res.post;

        const postTestID = `channel.post_list.post.${post.id}`;
        baseMatcher = by.id(postTestID);

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);
    });

    afterEach(async () => {
        await ChannelScreen.back();
    });

    afterAll(async () => {
        device.enableSynchronization();
        const calc = [];
        for (let i = 0; i < N_RUNS; i++) {
            calc.push(times[i]!.after - times[i]!.prev);
        }

        checkWithBaseline(calc, performance_baseline.switchChannel);
    });

    for (let i = 0; i < N_RUNS + 1; i++) {
        it(`name ${i}`, async () => {
            await waitFor(ChannelListScreen.getChannelItemDisplayName(channelsCategory, testChannel.name)).toBeVisible().withTimeout(5000);
            const prev = Date.now();
            await ChannelScreen.open(channelsCategory, testChannel.name);
            await waitFor(element(baseMatcher)).toBeVisible().withTimeout(3000);
            const after = Date.now();

            // Skip first channel switch, since it includes also post loading delays
            if (i !== 0) {
                times.push({prev, after});
            }
        });
    }
});
