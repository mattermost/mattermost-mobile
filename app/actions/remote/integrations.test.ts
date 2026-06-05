// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import IntegrationsManager from '@managers/integrations_manager';
import NetworkManager from '@managers/network_manager';
import {logDebug} from '@utils/log';

import {postActionWithCookie} from './integrations';
import {forceLogoutIfNecessary} from './session';

import type {Client} from '@client/rest';

jest.mock('@managers/network_manager');
jest.mock('./session');
jest.mock('@utils/log');

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
            '',
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
