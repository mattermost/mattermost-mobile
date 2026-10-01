// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MINIMUM_MAJOR_VERSION, MINIMUM_MINOR_VERSION, MINIMUM_PATCH_VERSION} from '@agents/constants/version';
import {ChannelAccessLevel} from '@agents/types';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import TestHelper from '@test/test_helper';

import {observeHasAvailableAgents} from './agents';

import type ServerDataOperator from '@database/operator/server_data_operator';

describe('observeHasAvailableAgents', () => {
    const serverUrl = 'agents-queries.test.com';
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.AGENTS_VERSION, value: `${MINIMUM_MAJOR_VERSION}.${MINIMUM_MINOR_VERSION}.${MINIMUM_PATCH_VERSION}`}],
            prepareRecordsOnly: false,
        });
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should re-emit when an existing bot loses access to the channel', async () => {
        await operator.handleAIBots({
            bots: [TestHelper.fakeLLMBot({id: 'bot1', channelAccessLevel: ChannelAccessLevel.All})],
            prepareRecordsOnly: false,
        });

        const next = jest.fn();
        const subscription = observeHasAvailableAgents(operator.database, 'channel1').subscribe({next});
        await TestHelper.wait(0);
        expect(next).toHaveBeenLastCalledWith(true);

        await operator.handleAIBots({
            bots: [TestHelper.fakeLLMBot({id: 'bot1', channelAccessLevel: ChannelAccessLevel.Block, channelIDs: ['channel1']})],
            prepareRecordsOnly: false,
        });
        await TestHelper.wait(0);

        expect(next).toHaveBeenLastCalledWith(false);
        subscription.unsubscribe();
    });
});
