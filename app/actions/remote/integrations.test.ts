// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import IntegrationsManager from '@managers/integrations_manager';
import NetworkManager from '@managers/network_manager';
import {logDebug} from '@utils/log';

import * as integrations from './integrations';
import {forceLogoutIfNecessary} from './session';

const serverUrl = 'baseHandler.test.com';
const submission = {} as DialogSubmission;

const mockClient: any = {
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

    // @ts-ignore
    NetworkManager.getClient = jest.fn();
});

function assertError(result: unknown, logMessage: string) {
    jest.mocked(NetworkManager.getClient).mockImplementationOnce(() => {
        throw new Error('Not found');
    });

    expect(result).toHaveProperty('error');
    expect(logDebug).toHaveBeenCalledWith(logMessage, expect.any(String));
    expect(forceLogoutIfNecessary).toHaveBeenCalledWith(expect.any(String), expect.any(Object));

}

describe('integrations', () => {

    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('submitInteractiveDialog', () => {
        it('should fetch and return data', async () => {
            jest.mocked(NetworkManager.getClient).mockImplementationOnce(() => mockClient);

            jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockImplementationOnce(
                () => ({} as any));
            const result = await integrations.submitInteractiveDialog(serverUrl, submission);
            expect(result).toHaveProperty('data');
        });

        it('should fetch and return error, logging error message and invoking forceLogoutIfNecessary()', async () => {
            const result = await integrations.submitInteractiveDialog(serverUrl, submission);
            const errorMessage = 'error on submitInteractiveDialog';
            await assertError(result, errorMessage);
        });
    });

    describe('postActionWithCookie', () => {
        const postId = 'post';
        const actionId = 'action';
        const actionCookie = 'cookie';
        it('should fetch and return data', async () => {

            jest.mocked(NetworkManager.getClient).mockImplementationOnce(() => mockClient);
            jest.mocked(mockClient.doPostActionWithCookie).mockImplementationOnce(() => ({trigger_id: 'trigger_id'}));

            const mockSetTriggerId = jest.fn();
            jest.spyOn(IntegrationsManager, 'getManager').mockReturnValueOnce({
                setTriggerId: mockSetTriggerId,
            } as any);

            const result = await integrations.postActionWithCookie(serverUrl, postId, actionId, actionCookie);
            expect(mockClient.doPostActionWithCookie).toHaveBeenCalledWith(postId, actionId, actionCookie, '');
            expect(IntegrationsManager.getManager).toHaveBeenCalledWith(serverUrl);
            expect(result).toHaveProperty('data');
        });

        it('should fetch and return error, logging error message and invoking forceLogoutIfNecessary()', async () => {
            const result = await integrations.postActionWithCookie(serverUrl, postId, actionId, actionCookie);
            const errorMessage = 'error on postActionWithCookie';
            await assertError(result, errorMessage);
        });
    });

    describe('selectAttachmentMenuAction', () => {
        const postId = 'post';
        const actionId = 'action';
        const selectedOption = 'option';

        it('should call postActionWithCookie with empty actionCookie and a selectedOption', async () => {

            jest.mocked(NetworkManager.getClient).mockImplementationOnce(() => mockClient);
            jest.mocked(mockClient.doPostActionWithCookie).mockImplementationOnce(() => ({trigger_id: 'trigger_id'}));

            const emptyActionCookie = '';
            const result = await integrations.selectAttachmentMenuAction(serverUrl, postId, actionId, selectedOption);

            // TODO: improve test mocking integrations.postActionWithCookie
            expect(result).toHaveProperty('data');
            expect(mockClient.doPostActionWithCookie).toHaveBeenCalledWith(postId, actionId, emptyActionCookie, selectedOption);
        });

    });
});
