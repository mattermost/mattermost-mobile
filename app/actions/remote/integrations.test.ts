// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getCurrentChannelId, getCurrentTeamId} from '@app/queries/servers/system';
import {logDebug} from '@app/utils/log';
import DatabaseManager from '@database/manager';
import IntegrationsManager from '@managers/integrations_manager';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';

import * as integrations from './integrations';
import {forceLogoutIfNecessary} from './session';

jest.mock('@database/manager');
jest.mock('@managers/integrations_manager');
jest.mock('@queries/servers/system');
jest.mock('./session');
jest.mock('@utils/log');
jest.mock('@utils/errors');

describe('integrations', () => {
    const serverUrl = 'baseHandler.test.com';
    const postId = 'post_id';
    const actionId = 'action_id';
    const actionCookie = 'action_cookie';
    const selectedOption = 'option1';

    const mockClient = {
        submitInteractiveDialog: jest.fn(),
        doPostActionWithCookie: jest.fn(),
    };

    beforeAll(() => {
        // eslint-disable-next-line
        // @ts-ignore
        NetworkManager.getClient = () => mockClient;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('submitInteractiveDialog', () => {
        beforeEach(async () => {
            await DatabaseManager.init([serverUrl]);
        });

        afterEach(async () => {
            await DatabaseManager.destroyServerDatabase(serverUrl);
        });

        it('should submit the dialog successfully', async () => {
            mockClient.submitInteractiveDialog.mockResolvedValue({status: 200});
            (getCurrentChannelId as jest.Mock).mockResolvedValue('channel_id');
            (getCurrentTeamId as jest.Mock).mockResolvedValue('team_id');
            const {data} = await integrations.submitInteractiveDialog(serverUrl, {url: 'url'} as DialogSubmission);
            expect(data).toBeDefined();
            expect(mockClient.submitInteractiveDialog).toHaveBeenCalledWith({
                url: 'url',
                channel_id: 'channel_id',
                team_id: 'team_id',
            });
        });

        it('should handle errors correctly', async () => {
            const error = new Error('Test error');
            mockClient.submitInteractiveDialog.mockRejectedValue(error);
            (getFullErrorMessage as jest.Mock).mockReturnValue('Full error message');

            const {error: resultError} = await integrations.submitInteractiveDialog(serverUrl, {url: 'url'} as DialogSubmission);

            expect(resultError).toBeTruthy();
            expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, error);
            expect(logDebug).toHaveBeenCalledWith('error on submitInteractiveDialog', 'Full error message');
        });
    });

    describe('postActionWithCookie', () => {
        beforeEach(() => {
            mockClient.doPostActionWithCookie.mockResolvedValue({status: 200, trigger_id: 'trigger_id'});
        });

        it('should post action with cookie successfully', async () => {
            const mockSetTriggerId = jest.fn();
            IntegrationsManager.getManager = jest.fn().mockReturnValue({
                setTriggerId: mockSetTriggerId,
            });

            const {data} = await integrations.postActionWithCookie(serverUrl, postId, actionId, actionCookie, selectedOption);

            expect(data).toBeDefined();
            expect(mockClient.doPostActionWithCookie).toHaveBeenCalledWith(postId, actionId, actionCookie, selectedOption);
            expect(mockSetTriggerId).toHaveBeenCalledWith('trigger_id');
        });

        it('should handle errors correctly and call forceLogoutIfNecessary, logDebug, and getFullErrorMessage', async () => {
            const error = new Error('Error message');
            mockClient.doPostActionWithCookie.mockRejectedValue(error);
            (getFullErrorMessage as jest.Mock).mockReturnValue('Full error message');

            const {error: resultError} = await integrations.postActionWithCookie(serverUrl, postId, actionId, actionCookie, selectedOption);

            expect(resultError).toBeTruthy();
            expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, error);
            expect(logDebug).toHaveBeenCalledWith('error on postActionWithCookie', 'Full error message');
        });
    });

    describe('selectAttachmentMenuAction', () => {
        it('should call postActionWithCookie with the correct parameters', async () => {
            mockClient.doPostActionWithCookie.mockResolvedValue({status: 200, trigger_id: 'trigger_id'});
            IntegrationsManager.getManager = jest.fn().mockReturnValue({setTriggerId: jest.fn()});

            const data = await integrations.selectAttachmentMenuAction(serverUrl, postId, actionId, selectedOption);

            expect(data).toBeDefined();
            expect(mockClient.doPostActionWithCookie).toHaveBeenCalledWith(postId, actionId, '', selectedOption);
        });
    });
});
