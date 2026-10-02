// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {updateAgentsVersion} from '@agents/actions/remote/version';
import streamingStore from '@agents/store/streaming_store';
import DatabaseManager from '@database/manager';
import {logDebug} from '@utils/log';

import {handleAgentsReconnect} from './reconnect';

import {settleStreamedPost} from './index';

const serverUrl = 'test-server.com';

jest.mock('@agents/actions/remote/version');
jest.mock('./index', () => ({settleStreamedPost: jest.fn()}));
jest.mock('@utils/log');

describe('handleAgentsReconnect', () => {
    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);

        jest.mocked(updateAgentsVersion).mockResolvedValue({data: true});
        jest.mocked(settleStreamedPost).mockClear();
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should return early if database is not found', async () => {
        await DatabaseManager.deleteServerDatabase(serverUrl);

        await handleAgentsReconnect(serverUrl);

        expect(updateAgentsVersion).not.toHaveBeenCalled();
    });

    it('should update agents version', async () => {
        await handleAgentsReconnect(serverUrl);

        expect(updateAgentsVersion).toHaveBeenCalledWith(serverUrl);
        expect(updateAgentsVersion).toHaveBeenCalledTimes(1);
    });

    it('should settle posts whose stream end may have been missed while disconnected', async () => {
        streamingStore.startStreaming(serverUrl, 'post1');

        await handleAgentsReconnect(serverUrl);

        expect(streamingStore.getStreamingState(serverUrl, 'post1')?.generating).toBe(false);
        expect(settleStreamedPost).toHaveBeenCalledWith(serverUrl, 'post1', true);
        expect(settleStreamedPost).toHaveBeenCalledTimes(1);
        streamingStore.removeServer(serverUrl);
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
