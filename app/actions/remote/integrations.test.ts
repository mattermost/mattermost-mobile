// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import IntegrationsManager from '@managers/integrations_manager';
import NetworkManager from '@managers/network_manager';
import {logDebug} from '@utils/log';

import * as integrations from './integrations';
import {forceLogoutIfNecessary} from './session';

import type {Client} from '@client/rest';

const serverUrl = 'baseHandler.test.com';
const submission = {} as DialogSubmission;

const mockClient: Partial<Client> = {
    submitInteractiveDialog: jest.fn().mockResolvedValue({dummy: 'data'}),
    doPostActionWithCookie: jest.fn(),
};

jest.mock('@database/manager', () => ({
    getServerDatabaseAndOperator: jest.fn(),
}));

jest.mock('@queries/servers/system', () => {
    const original = jest.requireActual('@queries/servers/system');
    return {
        ...original,
        getCurrentChannelId: jest.fn().mockResolvedValue('channel_id'),
        getCurrentTeamId: jest.fn().mockResolvedValue('team_id'),
    };
});

jest.mock('@managers/integrations_manager');

jest.mock('./session', () => {
    const original = jest.requireActual('./session');
    return {
        ...original,
        forceLogoutIfNecessary: jest.fn(),
    };
});

jest.mock('@utils/log', () => ({
    logDebug: jest.fn(),
}));

beforeAll(() => {
    jest.spyOn(NetworkManager, 'getClient').mockImplementation(jest.fn());
});

describe('integrations', () => {

    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('submitInteractiveDialog', () => {
        it('should fetch and return object with property data', async () => {
            jest.mocked(NetworkManager.getClient).mockImplementationOnce(() => mockClient as Client);

            jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockImplementationOnce(
                () => ({} as any));
            const result = await integrations.submitInteractiveDialog(serverUrl, submission);
            expect(result).toHaveProperty('data');
        });

        it('should fetch and return object with property error, logging error message and invoking forceLogoutIfNecessary()', async () => {
            const result = await integrations.submitInteractiveDialog(serverUrl, submission);

            jest.mocked(NetworkManager.getClient).mockImplementationOnce(() => {
                throw new Error('Not found');
            });

            expect(result).toHaveProperty('error');
            expect(logDebug).toHaveBeenCalledWith('error on submitInteractiveDialog', expect.any(String));
            expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, expect.any(Object));
        });
    });

    describe('postActionWithCookie', () => {
        const postId = 'post';
        const actionId = 'action';
        const actionCookie = 'cookie';
        it('should fetch and return object with property data', async () => {

            jest.mocked(NetworkManager.getClient).mockImplementationOnce(() => mockClient as Client);
            jest.mocked(mockClient.doPostActionWithCookie)?.mockResolvedValueOnce({});

            const result = await integrations.postActionWithCookie(serverUrl, postId, actionId, actionCookie);
            expect(mockClient.doPostActionWithCookie).toHaveBeenCalledWith(postId, actionId, actionCookie, '');
            expect(result).toHaveProperty('data');
        });

        it('should fetch and return object with property data and trigger_id within', async () => {
            const trigger_id = 'trigger_id';

            jest.mocked(NetworkManager.getClient).mockImplementationOnce(() => mockClient as Client);
            jest.mocked(mockClient.doPostActionWithCookie)?.mockResolvedValueOnce({trigger_id});

            const mockTriggerId = jest.fn();

            jest.spyOn(IntegrationsManager, 'getManager').mockImplementationOnce(() => ({
                setTriggerId: mockTriggerId,
            } as any));

            const result = await integrations.postActionWithCookie(serverUrl, postId, actionId, actionCookie);
            expect(mockClient.doPostActionWithCookie).toHaveBeenCalledWith(postId, actionId, actionCookie, '');
            expect(IntegrationsManager.getManager).toHaveBeenCalledWith(serverUrl);

            expect(mockTriggerId).toHaveBeenCalledWith(trigger_id);
            expect(result).toHaveProperty('data');
        });

        it('should fetch and return object with property error, logging error message and invoking forceLogoutIfNecessary()', async () => {
            const result = await integrations.postActionWithCookie(serverUrl, postId, actionId, actionCookie);

            jest.mocked(NetworkManager.getClient).mockImplementationOnce(() => {
                throw new Error('Not found');
            });

            expect(result).toHaveProperty('error');
            expect(logDebug).toHaveBeenCalledWith('error on postActionWithCookie', expect.any(String));
            expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, expect.any(Object));
        });
    });
});
