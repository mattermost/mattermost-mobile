// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchAIBots} from '@agents/actions/remote/bots';
import {updateAgentsVersion} from '@agents/actions/remote/version';
import DatabaseManager from '@database/manager';
import {logDebug} from '@utils/log';

import {handleAgentsReconnect} from './reconnect';

const serverUrl = 'test-server.com';

jest.mock('@agents/actions/remote/bots');
jest.mock('@agents/actions/remote/version');
jest.mock('@utils/log');

describe('handleAgentsReconnect', () => {
    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);

        jest.mocked(updateAgentsVersion).mockResolvedValue({data: true});
        jest.mocked(fetchAIBots).mockResolvedValue({bots: []});
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should return early if database is not found', async () => {
        await DatabaseManager.deleteServerDatabase(serverUrl);

        await handleAgentsReconnect(serverUrl);

        expect(updateAgentsVersion).not.toHaveBeenCalled();
        expect(fetchAIBots).not.toHaveBeenCalled();
    });

    it('should update agents version and refresh the AI bot list', async () => {
        await handleAgentsReconnect(serverUrl);

        expect(updateAgentsVersion).toHaveBeenCalledWith(serverUrl);
        expect(updateAgentsVersion).toHaveBeenCalledTimes(1);
        expect(fetchAIBots).toHaveBeenCalledWith(serverUrl);
        expect(fetchAIBots).toHaveBeenCalledTimes(1);
    });

    it('should handle error from updateAgentsVersion', async () => {
        const error = new Error('Update error');
        jest.mocked(updateAgentsVersion).mockResolvedValueOnce({error});

        await handleAgentsReconnect(serverUrl);

        expect(updateAgentsVersion).toHaveBeenCalledWith(serverUrl);
        expect(updateAgentsVersion).toHaveBeenCalledTimes(1);
        expect(logDebug).toHaveBeenCalledWith('Error updating agents version on reconnect', error);
    });
});
