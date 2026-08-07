// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import IntegrationsManager from '@managers/integrations_manager';
import NetworkManager from '@managers/network_manager';
import {getBlockActionsEnabled} from '@queries/servers/features';
import {getCurrentChannelId} from '@queries/servers/system';
import {logDebug} from '@utils/log';

import {doBlockAction, executeDialogAction, postActionWithCookie} from './integrations';
import {forceLogoutIfNecessary} from './session';

import type {Client} from '@client/rest';

jest.mock('@managers/network_manager');
jest.mock('./session');
jest.mock('@utils/log');
jest.mock('@database/manager', () => ({
    __esModule: true,
    default: {
        getServerDatabaseAndOperator: jest.fn(() => ({database: {}})),
    },
}));
jest.mock('@queries/servers/system', () => ({
    getCurrentChannelId: jest.fn(() => Promise.resolve('current_channel_id')),
    getCurrentTeamId: jest.fn(() => Promise.resolve('current_team_id')),
}));
jest.mock('@queries/servers/features', () => ({
    getBlockActionsEnabled: jest.fn(() => Promise.resolve(true)),
}));

describe('executeDialogAction', () => {
    const serverUrl = 'https://server.com';
    const actionUrl = 'https://example.com/dialog/action';
    const mockExecuteDialogAction = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(NetworkManager.getClient).mockReturnValue({
            executeDialogAction: mockExecuteDialogAction,
        } as unknown as Client);
    });

    it('should call client.executeDialogAction with the current channel and team', async () => {
        const response = {status: 'OK', trigger_id: ''};
        mockExecuteDialogAction.mockResolvedValue(response);

        const result = await executeDialogAction(serverUrl, actionUrl);

        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockExecuteDialogAction).toHaveBeenCalledWith(
            actionUrl,
            undefined,
            'current_channel_id',
            'current_team_id',
        );
        expect(result).toEqual({data: response});
    });

    it('should forward the optional context', async () => {
        mockExecuteDialogAction.mockResolvedValue({status: 'OK'});
        const context = {field: 'value', selected: 'opt'};

        await executeDialogAction(serverUrl, actionUrl, context);

        expect(mockExecuteDialogAction).toHaveBeenCalledWith(
            actionUrl,
            context,
            'current_channel_id',
            'current_team_id',
        );
    });

    it('should set trigger id when response includes trigger_id', async () => {
        const setTriggerId = jest.fn();
        jest.spyOn(IntegrationsManager, 'getManager').mockReturnValue({
            setTriggerId,
        } as never);
        mockExecuteDialogAction.mockResolvedValue({trigger_id: 'trigger_id'});

        const result = await executeDialogAction(serverUrl, actionUrl);

        expect(IntegrationsManager.getManager).toHaveBeenCalledWith(serverUrl);
        expect(setTriggerId).toHaveBeenCalledWith('trigger_id');
        expect(result).toEqual({data: {trigger_id: 'trigger_id'}});
    });

    it('should return error and call forceLogoutIfNecessary when API call fails', async () => {
        const error = new Error('API error');
        mockExecuteDialogAction.mockRejectedValue(error);

        const result = await executeDialogAction(serverUrl, actionUrl);

        expect(logDebug).toHaveBeenCalledWith('error on executeDialogAction', error.message);
        expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, error);
        expect(result).toEqual({error});
    });
});

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

describe('doBlockAction', () => {
    const serverUrl = 'https://server.com';
    const request: DoBlockActionRequest = {
        subtype: 'execute',
        context: 'post',
        post_id: 'post_id',
        action_id: 'action_id',
        cookie: 'cookie',
        form_values: {title: 'Bug'},
        integration_format: 'mm_block',
    };
    const mockDoBlockAction = jest.fn();
    const mockDoPostActionWithCookie = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(getBlockActionsEnabled).mockResolvedValue(true);
        jest.mocked(NetworkManager.getClient).mockReturnValue({
            doBlockAction: mockDoBlockAction,
            doPostActionWithCookie: mockDoPostActionWithCookie,
        } as unknown as Client);
    });

    it('should call client.doBlockAction and return data', async () => {
        const response = {type: 'ok' as const};
        mockDoBlockAction.mockResolvedValue(response);

        const result = await doBlockAction(serverUrl, request);

        expect(mockDoBlockAction).toHaveBeenCalledWith(request);
        expect(result).toEqual({data: response});
    });

    it('should fall back to doPostActionWithCookie when block actions are unavailable', async () => {
        jest.mocked(getBlockActionsEnabled).mockResolvedValue(false);
        mockDoPostActionWithCookie.mockResolvedValue({status: 'OK'});

        const result = await doBlockAction(serverUrl, {
            ...request,
            selected_option: 'opt',
            query: {row: '1'},
            form_values: {title: 'Bug', tags: ['a', 'b'], notify: true},
        });

        expect(mockDoBlockAction).not.toHaveBeenCalled();
        expect(mockDoPostActionWithCookie).toHaveBeenCalledWith(
            'post_id',
            'action_id',
            'cookie',
            'opt',
            {row: '1'},
            'mm_block',
        );
        expect(result).toEqual({data: {status: 'OK'}});
    });

    it('should not fall back for lookup or dialog actions on older servers', async () => {
        jest.mocked(getBlockActionsEnabled).mockResolvedValue(false);

        const lookupResult = await doBlockAction(serverUrl, {
            ...request,
            subtype: 'lookup',
        });
        expect(mockDoBlockAction).not.toHaveBeenCalled();
        expect(mockDoPostActionWithCookie).not.toHaveBeenCalled();
        expect(lookupResult.error).toBeInstanceOf(Error);

        const dialogResult = await doBlockAction(serverUrl, {
            ...request,
            context: 'dialog',
            post_id: '',
        });
        expect(mockDoBlockAction).not.toHaveBeenCalled();
        expect(dialogResult.error).toBeInstanceOf(Error);
    });

    it('should fill in the current channel for dialog actions without one', async () => {
        mockDoBlockAction.mockResolvedValue({type: 'ok' as const});

        await doBlockAction(serverUrl, {...request, context: 'dialog', post_id: ''});

        expect(mockDoBlockAction).toHaveBeenCalledWith(expect.objectContaining({
            channel_id: 'current_channel_id',
        }));
    });

    it('should keep the channel provided by the caller', async () => {
        mockDoBlockAction.mockResolvedValue({type: 'ok' as const});

        await doBlockAction(serverUrl, {...request, context: 'dialog', post_id: '', channel_id: 'given_channel_id'});

        expect(getCurrentChannelId).not.toHaveBeenCalled();
        expect(mockDoBlockAction).toHaveBeenCalledWith(expect.objectContaining({
            channel_id: 'given_channel_id',
        }));
    });

    it('should not add a channel for post actions', async () => {
        mockDoBlockAction.mockResolvedValue({type: 'ok' as const});

        await doBlockAction(serverUrl, request);

        expect(getCurrentChannelId).not.toHaveBeenCalled();
        expect(mockDoBlockAction).toHaveBeenCalledWith(request);
    });

    it('should set trigger id when response includes trigger_id', async () => {
        const setTriggerId = jest.fn();
        jest.spyOn(IntegrationsManager, 'getManager').mockReturnValue({
            setTriggerId,
        } as never);
        mockDoBlockAction.mockResolvedValue({trigger_id: 'trigger_id'});

        await doBlockAction(serverUrl, request);

        expect(setTriggerId).toHaveBeenCalledWith('trigger_id');
    });

    it('should return error when API call fails', async () => {
        const error = new Error('API error');
        mockDoBlockAction.mockRejectedValue(error);

        const result = await doBlockAction(serverUrl, request);

        expect(logDebug).toHaveBeenCalledWith('error on doBlockAction', error.message);
        expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, error);
        expect(result).toEqual({error});
    });
});
