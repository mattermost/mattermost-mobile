// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client} from '@client/rest';
import ClientError from '@client/rest/error';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getExpandedLinks} from '@queries/servers/system';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import {doPing, getRedirectLocation} from './general';
import {forceLogoutIfNecessary} from './session';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';
import type {ServerDatabase} from '@typings/database/database';
import type {MessageDescriptor} from 'react-intl';

jest.mock('@managers/network_manager');
jest.mock('@database/manager');
jest.mock('@queries/servers/system');
jest.mock('@utils/log');
jest.mock('./session');
jest.mock('@utils/errors');

describe('general', () => {

    const mockClient = {
        ping: jest.fn(),
    } as unknown as Client;

    beforeAll(() => {
        NetworkManager.getClient = () => mockClient;
    });

    const serverUrl = 'https://example.com';

    const pingError: MessageDescriptor = {
        id: 'mobile.server_ping_failed',
        defaultMessage: 'Cannot connect to the server.',
    };

    describe('doPing', () => {
        it('should return object with property error when NetworkManager cannot create a client', async () => {
            jest.spyOn(NetworkManager, 'createClient').mockImplementation(() => {
                throw new Error('failed to create client');
            });

            const result = await doPing(serverUrl, false);
            expect(result).toHaveProperty('error');
        });

        it('should return object with property error and message related to client certificate', async () => {
            jest.spyOn(NetworkManager, 'createClient').mockResolvedValue(mockClient);
            jest.spyOn(mockClient, 'ping').mockResolvedValue({code: 401});
            const result: any = await doPing(serverUrl, false);
            expect(result.error.intl).toEqual({
                id: 'mobile.server_requires_client_certificate',
                defaultMessage: 'Server requires client certificate for authentication.',
            });
        });

        it('should invalidate the client, return object with property error and message related to ping error', async () => {
            jest.spyOn(NetworkManager, 'createClient').mockResolvedValue(mockClient);
            jest.spyOn(NetworkManager, 'invalidateClient');
            jest.spyOn(mockClient, 'ping').mockResolvedValue({
                code: 403,
                ok: false,
                headers: {
                    'x-reject-reason': 'pre-auth',
                },
            });
            const result: any = await doPing(serverUrl, false);

            expect(result).toEqual({
                error: {
                    intl: {...pingError},
                },
                isPreauthError: true,
            });
            expect(NetworkManager.invalidateClient).toHaveBeenCalledWith(serverUrl);
        });

        it('should invalidate the client, return object with property error and message related to ping error when response is not ok', async () => {
            jest.spyOn(NetworkManager, 'createClient').mockResolvedValue(mockClient);
            jest.spyOn(NetworkManager, 'invalidateClient');
            jest.spyOn(mockClient, 'ping').mockResolvedValue({
                code: 400,
                ok: false,
            });

            const result: any = await doPing(serverUrl, false);

            expect(result).toEqual({
                error: {
                    intl: {...pingError},
                },
            });
            expect(NetworkManager.invalidateClient).toHaveBeenCalledWith(serverUrl);
        });

        it('should return object with property error and message related to ping error when ping throws error AND code is 403 and reject reason is pre-auth', async () => {
            jest.spyOn(NetworkManager, 'createClient').mockResolvedValue(mockClient);
            jest.spyOn(mockClient, 'ping').mockImplementation(() => {
                const clientError = new ClientError(serverUrl, {
                    message: 'error',
                    url: '/ping',
                    status_code: 403,
                    headers: {
                        'x-reject-reason': 'pre-auth',
                    },
                });
                throw clientError;
            });

            const result: any = await doPing(serverUrl, false);

            expect(result).toEqual({
                error: {
                    intl: {...pingError},
                },
                isPreauthError: true,
            });
        });

        it('should return object with property error and message related to ping error when ping throws error AND invalidate client', async () => {
            jest.spyOn(NetworkManager, 'createClient').mockResolvedValue(mockClient);
            jest.spyOn(mockClient, 'ping').mockImplementation(() => {
                const clientError = new ClientError(serverUrl, {
                    message: 'error',
                    url: '/ping',
                    status_code: 400,
                });
                throw clientError;
            });
            jest.spyOn(NetworkManager, 'invalidateClient');

            const result: any = await doPing(serverUrl, false);

            expect(result).toEqual({
                error: {
                    intl: {...pingError},
                },
            });
            expect(NetworkManager.invalidateClient).toHaveBeenCalledWith(serverUrl);
        });

        it('should return object with property canReceiveNotifications when verifyPushProxy flag is true', async () => {
            jest.spyOn(NetworkManager, 'createClient').mockResolvedValue(mockClient);
            jest.spyOn(mockClient, 'ping').mockResolvedValue({
                code: 200,
                ok: true,
                data: {
                    CanReceiveNotifications: null,
                },
            });

            const result: any = await doPing(serverUrl, true);
            expect(result).toEqual({canReceiveNotifications: 'true'});
        });

        it('should return empty object when verifyPushProxy flag is false', async () => {
            jest.spyOn(NetworkManager, 'createClient').mockResolvedValue(mockClient);
            jest.spyOn(mockClient, 'ping').mockResolvedValue({
                code: 200,
                ok: true,
            });

            const result: any = await doPing(serverUrl, false);
            expect(result).toEqual({});
        });

    });

    describe('getRedirectLocation', () => {
        const client: Partial<Client> = {
            getRedirectLocation: jest.fn(),
        };

        const link = 'https://example.com/somepath';
        const database = {} as Database;
        const operator = {
            handleSystem: jest.fn(),
        } as Partial<ServerDataOperator>;

        it('should return object with property expandedLink and get expanded links when location is present', async () => {
            jest.spyOn(NetworkManager, 'getClient').mockReturnValue(client as Client);
            jest.spyOn(DatabaseManager, 'getServerDatabaseAndOperator').mockReturnValue({
                database,
                operator,
            } as ServerDatabase);

            jest.spyOn(client, 'getRedirectLocation').mockResolvedValue({
                location: 'https://example.com/expanded',
            });

            jest.mocked(getExpandedLinks).mockResolvedValue({});

            const result = await getRedirectLocation(serverUrl, link);

            expect(result).toHaveProperty('expandedLink');
            expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
            expect(DatabaseManager.getServerDatabaseAndOperator).toHaveBeenCalledWith(serverUrl);
            expect(client.getRedirectLocation).toHaveBeenCalledWith(link);
            expect(getExpandedLinks).toHaveBeenCalledWith(database);
            expect(operator.handleSystem).toHaveBeenCalled();
        });

        it('should return object with property error when error occurs', async () => {
            const errorMesssage = 'Full error message';
            jest.spyOn(NetworkManager, 'getClient').mockImplementation(() => {
                throw new Error('Client error');
            });
            (getFullErrorMessage as jest.Mock).mockReturnValue(errorMesssage);

            const result = await getRedirectLocation(serverUrl, link);

            expect(result).toHaveProperty('error');
            expect(logDebug).toHaveBeenCalledWith('error on getRedirectLocation', errorMesssage);
            expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, expect.any(Object));
        });
    });
});
