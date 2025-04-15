// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {of as of$, firstValueFrom} from 'rxjs';

import {
    observeCallsConfig,
    observeCallsState,
    observeChannelsWithCalls,
    observeCurrentCall,
    observeIncomingCalls,
} from '@calls/state';
import {DefaultCallsState} from '@calls/types/calls';
import {License} from '@constants';
import DatabaseManager from '@database/manager';
import {observeConfigValue, observeLicense} from '@queries/servers/system';
import {queryUsersById} from '@queries/servers/user';

import {
    observeIsCallsEnabledInChannel,
    observeIsCallLimitRestricted,
    observeCallStateInChannel,
    observeEndCallDetails,
    observeCurrentSessionsDict,
} from './index';

jest.mock('@calls/state');
jest.mock('@queries/servers/system');
jest.mock('@queries/servers/user');

describe('Calls Observers', () => {
    const serverUrl = 'https://server.com';
    const channelId = 'channel1';
    const database = {} as any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock DatabaseManager
        (DatabaseManager as any).serverDatabases = {
            'test-server': {
                database: {},
            },
        };
    });

    describe('observeIsCallsEnabledInChannel', () => {
        beforeEach(() => {
            (observeCallsConfig as jest.Mock).mockReturnValue(of$({
                pluginEnabled: true,
                DefaultEnabled: true,
            }));
            (observeCallsState as jest.Mock).mockReturnValue(of$(DefaultCallsState));
            (observeConfigValue as jest.Mock).mockReturnValue(of$('7.6.0'));
        });

        it('should return false when plugin is disabled regardless of other settings', async () => {
            (observeCallsConfig as jest.Mock).mockReturnValue(of$({
                pluginEnabled: false,
                DefaultEnabled: true,
            }));
            (observeCallsState as jest.Mock).mockReturnValue(of$(DefaultCallsState));
            (observeConfigValue as jest.Mock).mockReturnValue(of$('10.5.0'));

            const result = await firstValueFrom(observeIsCallsEnabledInChannel(database, serverUrl, of$(channelId)));
            expect(result).toBe(false);
        });

        it('should return true when explicitly enabled', async () => {
            (observeCallsState as jest.Mock).mockReturnValue(of$({
                enabled: {[channelId]: true},
            }));

            const result = await firstValueFrom(observeIsCallsEnabledInChannel(database, serverUrl, of$(channelId)));
            expect(result).toBe(true);
        });

        it('should return false when explicitly disabled', async () => {
            (observeCallsState as jest.Mock).mockReturnValue(of$({
                enabled: {[channelId]: false},
            }));

            const result = await firstValueFrom(observeIsCallsEnabledInChannel(database, serverUrl, of$(channelId)));
            expect(result).toBe(false);
        });

        it('should return true for GA server when not explicitly disabled', async () => {
            (observeCallsState as jest.Mock).mockReturnValue(of$({enabled: {}}));
            (observeConfigValue as jest.Mock).mockReturnValue(of$('7.6.0'));

            const result = await firstValueFrom(observeIsCallsEnabledInChannel(database, serverUrl, of$(channelId)));
            expect(result).toBe(true);
        });

        it('should use default enabled when not GA server and not explicitly set', async () => {
            (observeCallsState as jest.Mock).mockReturnValue(of$({enabled: {}}));
            (observeConfigValue as jest.Mock).mockReturnValue(of$('7.5.0'));
            (observeCallsConfig as jest.Mock).mockReturnValue(of$({
                pluginEnabled: true,
                DefaultEnabled: true,
            }));

            const result = await firstValueFrom(observeIsCallsEnabledInChannel(database, serverUrl, of$(channelId)));
            expect(result).toBe(true);
        });
    });

    describe('observeIsCallLimitRestricted', () => {
        it('should detect when call limit is not restricted', async () => {
            (observeCallsConfig as jest.Mock).mockReturnValue(of$({
                MaxCallParticipants: 8,
                sku_short_name: License.SKU_SHORT_NAME.Professional,
            }));
            (observeCallsState as jest.Mock).mockReturnValue(of$({
                calls: {
                    [channelId]: {
                        sessions: {user1: {}, user2: {}},
                    },
                },
            }));
            (observeLicense as jest.Mock).mockReturnValue(of$({Cloud: 'false'}));

            const result = await firstValueFrom(observeIsCallLimitRestricted(database, serverUrl, channelId));
            expect(result).toEqual({
                limitRestricted: false,
                maxParticipants: 8,
                isCloudStarter: false,
            });
        });

        it('should detect when call limit is restricted', async () => {
            (observeCallsConfig as jest.Mock).mockReturnValue(of$({
                MaxCallParticipants: 3,
                sku_short_name: License.SKU_SHORT_NAME.Starter,
            }));
            (observeCallsState as jest.Mock).mockReturnValue(of$({
                calls: {
                    [channelId]: {
                        sessions: {user1: {}, user2: {}, user3: {}},
                    },
                },
            }));
            (observeLicense as jest.Mock).mockReturnValue(of$({Cloud: 'true'}));

            const result = await firstValueFrom(observeIsCallLimitRestricted(database, serverUrl, channelId));
            expect(result).toEqual({
                limitRestricted: true,
                maxParticipants: 3,
                isCloudStarter: true,
            });
        });
    });

    describe('observeCallStateInChannel', () => {
        it('should not show banner when no call in channel', async () => {
            (observeChannelsWithCalls as jest.Mock).mockReturnValue(of$({}));
            (observeCurrentCall as jest.Mock).mockReturnValue(of$(null));
            (observeCallsState as jest.Mock).mockReturnValue(of$({
                calls: {},
                myUserId: 'user1',
            }));
            (observeIncomingCalls as jest.Mock).mockReturnValue(of$({
                incomingCalls: [],
            }));

            const {showJoinCallBanner, isInACall, showIncomingCalls} = observeCallStateInChannel(serverUrl, database, of$(channelId));

            const bannerVisible = await firstValueFrom(showJoinCallBanner);
            const inCall = await firstValueFrom(isInACall);
            const hasIncoming = await firstValueFrom(showIncomingCalls);

            expect(bannerVisible).toBe(false);
            expect(inCall).toBe(false);
            expect(hasIncoming).toBe(false);
        });

        it('should detect active call in channel', async () => {
            (observeChannelsWithCalls as jest.Mock).mockReturnValue(of$({
                [channelId]: true,
            }));
            (observeCurrentCall as jest.Mock).mockReturnValue(of$({
                channelId: 'different-channel',
                connected: true,
            }));
            (observeCallsState as jest.Mock).mockReturnValue(of$({
                calls: {
                    [channelId]: {
                        dismissed: {},
                    },
                },
                myUserId: 'user1',
            }));
            (observeIncomingCalls as jest.Mock).mockReturnValue(of$({
                incomingCalls: [],
            }));

            const {showJoinCallBanner, isInACall, showIncomingCalls} = observeCallStateInChannel(serverUrl, database, of$(channelId));

            const bannerVisible = await firstValueFrom(showJoinCallBanner);
            const inCall = await firstValueFrom(isInACall);
            const hasIncoming = await firstValueFrom(showIncomingCalls);

            expect(bannerVisible).toBe(true);
            expect(inCall).toBe(true);
            expect(hasIncoming).toBe(false);
        });
    });

    describe('observeCurrentSessionsDict', () => {
        it('should handle empty/null call state', async () => {
            (observeCurrentCall as jest.Mock).mockReturnValue(of$(null));

            const result = await firstValueFrom(observeCurrentSessionsDict());
            expect(result).toEqual({});
        });

        it('should fill user models for sessions', async () => {
            const sessions = {
                session1: {userId: 'user1'},
                session2: {userId: 'user2'},
            };
            (observeCurrentCall as jest.Mock).mockReturnValue(of$({
                sessions,
                serverUrl: 'test-server',
            }));
            const userModels = [
                {id: 'user1', username: 'user.one'},
                {id: 'user2', username: 'user.two'},
            ];
            (queryUsersById as jest.Mock).mockReturnValue({
                observeWithColumns: () => of$(userModels),
            });

            const result = await firstValueFrom(observeCurrentSessionsDict());
            expect(result).toEqual({
                session1: {...sessions.session1, userModel: userModels[0]},
                session2: {...sessions.session2, userModel: userModels[1]},
            });
        });
    });

    describe('observeEndCallDetails', () => {
        it('should handle empty call state', async () => {
            (observeCurrentCall as jest.Mock).mockReturnValue(of$(null));

            const {otherParticipants, isAdmin, isHost} = observeEndCallDetails();

            const hasOthers = await firstValueFrom(otherParticipants);
            const admin = await firstValueFrom(isAdmin);
            const host = await firstValueFrom(isHost);

            expect(hasOthers).toBe(false);
            expect(admin).toBe(false);
            expect(host).toBe(false);
        });

        it('should determine host and admin status', async () => {
            (observeCurrentCall as jest.Mock).mockReturnValue(of$({
                myUserId: 'user1',
                mySessionId: 'session1',
                hostId: 'user1',
                sessions: {
                    session1: {
                        userModel: {
                            roles: 'system_admin',
                        },
                    },
                    session2: {},
                },
            }));

            const {otherParticipants, isAdmin, isHost} = observeEndCallDetails();

            const hasOthers = await firstValueFrom(otherParticipants);
            const admin = await firstValueFrom(isAdmin);
            const host = await firstValueFrom(isHost);

            expect(hasOthers).toBe(true);
            expect(admin).toBe(true);
            expect(host).toBe(true);
        });
    });
});
