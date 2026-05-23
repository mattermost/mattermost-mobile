// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import IntegrationsMananger from '@managers/integrations_manager';
import NetworkManager from '@managers/network_manager';

import {postActionWithQuery} from './integrations';
import {forceLogoutIfNecessary} from './session';

import type {Client} from '@client/rest';

jest.mock('@constants/device', () => ({}), {virtual: true});
jest.mock('@database/manager', () => ({}), {virtual: true});

jest.mock('@managers/network_manager');
jest.mock('@managers/integrations_manager');
jest.mock('./session');

describe('Actions.Remote.Integrations', () => {
    const serverUrl = 'https://server.com';
    const postId = 'post_id';
    const actionId = 'action_id';
    const query = {row: '12', col: 'A'};

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('postActionWithQuery', () => {
        it('should call client.doPostActionWithQuery and return data', async () => {
            const mockSetTriggerId = jest.fn();
            (IntegrationsMananger.getManager as jest.Mock).mockReturnValue({
                setTriggerId: mockSetTriggerId,
            });

            const mockClient = {
                doPostActionWithQuery: jest.fn().mockResolvedValue({trigger_id: 't123'}),
            };
            jest.mocked(NetworkManager.getClient).mockReturnValue(mockClient as unknown as Client);

            const result = await postActionWithQuery(serverUrl, postId, actionId, query);

            expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
            expect(mockClient.doPostActionWithQuery).toHaveBeenCalledWith(postId, actionId, query);
            expect(mockSetTriggerId).toHaveBeenCalledWith('t123');
            expect(result).toEqual({data: {trigger_id: 't123'}});
        });

        it('should not call setTriggerId when response lacks trigger_id', async () => {
            const mockSetTriggerId = jest.fn();
            (IntegrationsMananger.getManager as jest.Mock).mockReturnValue({
                setTriggerId: mockSetTriggerId,
            });

            const mockClient = {
                doPostActionWithQuery: jest.fn().mockResolvedValue({status: 'OK'}),
            };
            jest.mocked(NetworkManager.getClient).mockReturnValue(mockClient as unknown as Client);

            const result = await postActionWithQuery(serverUrl, postId, actionId, query);

            expect(mockSetTriggerId).not.toHaveBeenCalled();
            expect(result).toEqual({data: {status: 'OK'}});
        });

        it('should return error and call forceLogoutIfNecessary on failure', async () => {
            const mockError = new Error('network failure');
            const mockClient = {
                doPostActionWithQuery: jest.fn().mockRejectedValue(mockError),
            };
            jest.mocked(NetworkManager.getClient).mockReturnValue(mockClient as unknown as Client);

            const result = await postActionWithQuery(serverUrl, postId, actionId, query);

            expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, mockError);
            expect(result).toEqual({error: mockError});
        });
    });
});
