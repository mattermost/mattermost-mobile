// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import IntegrationsManager from '@managers/integrations_manager';
import NetworkManager from '@managers/network_manager';
import {getCurrentChannelId, getCurrentTeamId} from '@queries/servers/system';
import {logDebug} from '@utils/log';

import {executeDialogAction, postActionWithCookie} from './integrations';
import {forceLogoutIfNecessary} from './session';

import type {Client} from '@client/rest';

jest.mock('@managers/network_manager');
jest.mock('./session');
jest.mock('@utils/log');
jest.mock('@queries/servers/system', () => ({
    getCurrentChannelId: jest.fn(),
    getCurrentTeamId: jest.fn(),
}));

describe('postActionWithCookie', () => {
    const serverUrl = 'https://server.com';
    const postId = 'post_id';
    const actionId = 'action_id';
    const actionCookie = 'action_cookie';
    const error = new Error('API error');

    const mockDoPostActionWithCookie = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(NetworkManager.getClient).mockReturnValue({
            doPostActionWithCookie: mockDoPostActionWithCookie,
        } as unknown as Client);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should call doPostActionWithCookie with default optional args', async () => {
        const response = {status: 'OK'};
        mockDoPostActionWithCookie.mockResolvedValue(response);

        const result = await postActionWithCookie(serverUrl, postId, actionId, actionCookie);

        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockDoPostActionWithCookie).toHaveBeenCalledWith(
            postId,
            actionId,
            actionCookie,
            '',
            undefined,
            'attachment',
        );
        expect(result).toEqual({data: response});
    });

    it('should forward selectedOption, query, and integrationFormat', async () => {
        const query = {row: '12', col: 'A'};
        mockDoPostActionWithCookie.mockResolvedValue({});

        await postActionWithCookie(
            serverUrl,
            postId,
            actionId,
            actionCookie,
            'selected',
            query,
            'mm_block',
        );

        expect(mockDoPostActionWithCookie).toHaveBeenCalledWith(
            postId,
            actionId,
            actionCookie,
            'selected',
            query,
            'mm_block',
        );
    });

    it('should set trigger id when response includes trigger_id', async () => {
        const setTriggerId = jest.fn();
        jest.spyOn(IntegrationsManager, 'getManager').mockReturnValue({
            setTriggerId,
        } as never);
        mockDoPostActionWithCookie.mockResolvedValue({trigger_id: 'trigger_id'});

        const result = await postActionWithCookie(serverUrl, postId, actionId, actionCookie);

        expect(IntegrationsManager.getManager).toHaveBeenCalledWith(serverUrl);
        expect(setTriggerId).toHaveBeenCalledWith('trigger_id');
        expect(result).toEqual({data: {trigger_id: 'trigger_id'}});
    });

    it('should not set trigger id when response has no trigger_id', async () => {
        const setTriggerId = jest.fn();
        jest.spyOn(IntegrationsManager, 'getManager').mockReturnValue({
            setTriggerId,
        } as never);
        mockDoPostActionWithCookie.mockResolvedValue({});

        await postActionWithCookie(serverUrl, postId, actionId, actionCookie);

        expect(setTriggerId).not.toHaveBeenCalled();
    });

    it('should not set trigger id when integrations manager is unavailable', async () => {
        jest.spyOn(IntegrationsManager, 'getManager').mockReturnValue(undefined as never);
        mockDoPostActionWithCookie.mockResolvedValue({trigger_id: 'trigger_id'});

        const result = await postActionWithCookie(serverUrl, postId, actionId, actionCookie);

        expect(result).toEqual({data: {trigger_id: 'trigger_id'}});
    });

    it('should return error and call forceLogoutIfNecessary when API call fails', async () => {
        mockDoPostActionWithCookie.mockRejectedValue(error);

        const result = await postActionWithCookie(serverUrl, postId, actionId, actionCookie);

        expect(logDebug).toHaveBeenCalledWith('error on postActionWithCookie', error.message);
        expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, error);
        expect(result).toEqual({error});
    });

    it('should return error when getClient fails', async () => {
        const clientError = new Error('client error');
        jest.mocked(NetworkManager.getClient).mockImplementation(() => {
            throw clientError;
        });

        const result = await postActionWithCookie(serverUrl, postId, actionId, actionCookie);

        expect(mockDoPostActionWithCookie).not.toHaveBeenCalled();
        expect(logDebug).toHaveBeenCalledWith('error on postActionWithCookie', clientError.message);
        expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, clientError);
        expect(result).toEqual({error: clientError});
    });
});

describe('executeDialogAction', () => {
    const serverUrl = 'https://server.com';
    const url = 'http://example.com/plugin/action';
    const channelId = 'channel_id';
    const teamId = 'team_id';
    const error = new Error('API error');

    const mockExecuteDialogAction = jest.fn();

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        jest.clearAllMocks();
        jest.mocked(NetworkManager.getClient).mockReturnValue({
            executeDialogAction: mockExecuteDialogAction,
        } as unknown as Client);
        jest.mocked(getCurrentChannelId).mockResolvedValue(channelId);
        jest.mocked(getCurrentTeamId).mockResolvedValue(teamId);
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
        jest.restoreAllMocks();
    });

    it('should call client.executeDialogAction with channel and team ids from the database', async () => {
        mockExecuteDialogAction.mockResolvedValue({trigger_id: 'trigger_id'});

        const result = await executeDialogAction(serverUrl, url, {key: 'value'});

        expect(mockExecuteDialogAction).toHaveBeenCalledWith({
            url,
            context: {key: 'value'},
            channel_id: channelId,
            team_id: teamId,
        });
        expect(result).toEqual({data: {trigger_id: 'trigger_id'}});
    });

    it('should set trigger id when response includes trigger_id', async () => {
        const setTriggerId = jest.fn();
        jest.spyOn(IntegrationsManager, 'getManager').mockReturnValue({
            setTriggerId,
        } as never);
        mockExecuteDialogAction.mockResolvedValue({trigger_id: 'trigger_id'});

        const result = await executeDialogAction(serverUrl, url);

        expect(IntegrationsManager.getManager).toHaveBeenCalledWith(serverUrl);
        expect(setTriggerId).toHaveBeenCalledWith('trigger_id');
        expect(result).toEqual({data: {trigger_id: 'trigger_id'}});
    });

    it('should not set trigger id when response has no trigger_id', async () => {
        const setTriggerId = jest.fn();
        jest.spyOn(IntegrationsManager, 'getManager').mockReturnValue({
            setTriggerId,
        } as never);
        mockExecuteDialogAction.mockResolvedValue({});

        await executeDialogAction(serverUrl, url);

        expect(setTriggerId).not.toHaveBeenCalled();
    });

    it('should return error and call forceLogoutIfNecessary when API call fails', async () => {
        mockExecuteDialogAction.mockRejectedValue(error);

        const result = await executeDialogAction(serverUrl, url);

        expect(logDebug).toHaveBeenCalledWith('error on executeDialogAction', error.message);
        expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, error);
        expect(result).toEqual({error});
    });
});
