// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {of as of$, firstValueFrom} from 'rxjs';

import {
    observeCallsConfig,
    observeCallsState,
    observeChannelsWithCalls,
    observeCurrentCall,
    observeGlobalCallsState,
    observeIncomingCalls,
} from '@calls/state';
import {DefaultCallsState, DefaultGlobalCallsState} from '@calls/types/calls';
import {General, License} from '@constants';
import DatabaseManager from '@database/manager';
import {observeChannel} from '@queries/servers/channel';
import {observeConfigValue, observeLicense} from '@queries/servers/system';
import {observeUser, queryUsersById} from '@queries/servers/user';

import {
    observeIsCallsEnabledInChannel,
    observeIsCallLimitRestricted,
    observeCallStateInChannel,
    observeDMCallingState,
    observeCallChannel,
    observeEndCallDetails,
    observeCurrentSessionsDict,
} from './index';

jest.mock('@calls/state');
jest.mock('@queries/servers/channel');
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
        beforeEach(() => {
            (observeGlobalCallsState as jest.Mock).mockReturnValue(of$(DefaultGlobalCallsState));
        });

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

        it('should hide the current call bar while the call screen for that call is pending', async () => {
            (observeChannelsWithCalls as jest.Mock).mockReturnValue(of$({}));
            (observeCurrentCall as jest.Mock).mockReturnValue(of$({
                channelId,
                connected: true,
            }));
            (observeCallsState as jest.Mock).mockReturnValue(of$({calls: {}, myUserId: 'user1'}));
            (observeIncomingCalls as jest.Mock).mockReturnValue(of$({incomingCalls: []}));
            (observeGlobalCallsState as jest.Mock).mockReturnValue(of$({
                ...DefaultGlobalCallsState,
                pendingCallScreenChannelId: channelId,
            }));

            const {isInACall} = observeCallStateInChannel(serverUrl, database, of$(channelId));

            expect(await firstValueFrom(isInACall)).toBe(false);
        });

        it('should keep showing the current call bar while the call screen pending for another call', async () => {
            (observeChannelsWithCalls as jest.Mock).mockReturnValue(of$({}));
            (observeCurrentCall as jest.Mock).mockReturnValue(of$({
                channelId,
                connected: true,
            }));
            (observeCallsState as jest.Mock).mockReturnValue(of$({calls: {}, myUserId: 'user1'}));
            (observeIncomingCalls as jest.Mock).mockReturnValue(of$({incomingCalls: []}));
            (observeGlobalCallsState as jest.Mock).mockReturnValue(of$({
                ...DefaultGlobalCallsState,
                pendingCallScreenChannelId: 'other-channel',
            }));

            const {isInACall} = observeCallStateInChannel(serverUrl, database, of$(channelId));

            expect(await firstValueFrom(isInACall)).toBe(true);
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

    describe('observeCallChannel', () => {
        it('should resolve the channel from the call server database', async () => {
            const callServerDatabase = {id: 'call-server-db'} as any;
            (DatabaseManager as any).serverDatabases = {'test-server': {database: callServerDatabase}};
            (observeCurrentCall as jest.Mock).mockReturnValue(of$({serverUrl: 'test-server', channelId: 'channel1'}));
            (observeChannel as jest.Mock).mockReturnValue(of$({id: 'channel1', type: 'D'}));

            const result = await firstValueFrom(observeCallChannel());

            expect(observeChannel).toHaveBeenCalledWith(callServerDatabase, 'channel1');
            expect(result).toEqual({id: 'channel1', type: 'D'});
        });

        it('should emit undefined when the call server has no database', async () => {
            // the call is on a server other than the one whose database is loaded
            (observeCurrentCall as jest.Mock).mockReturnValue(of$({serverUrl: 'other-server', channelId: 'channel1'}));

            const result = await firstValueFrom(observeCallChannel());

            expect(result).toBeUndefined();
            expect(observeChannel).not.toHaveBeenCalled();
        });

        it('should emit undefined when there is no current call', async () => {
            (observeCurrentCall as jest.Mock).mockReturnValue(of$(null));

            const result = await firstValueFrom(observeCallChannel());

            expect(result).toBeUndefined();
            expect(observeChannel).not.toHaveBeenCalled();
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

    describe('observeDMCallingState', () => {
        const callee = {id: 'user2'};
        const dmCall = {
            serverUrl: 'test-server',
            channelId: 'dm-channel',
            connected: true,
            ownerId: 'user1',
            myUserId: 'user1',
            mySessionId: 'session1',
            startTime: 1000,
            dmCalleeAnsweredAt: 0,
            sessions: {session1: {sessionId: 'session1', userId: 'user1'}},
        };

        const getState = async (call: unknown, channel: unknown = {type: General.DM_CHANNEL, name: 'user1__user2'}) => {
            (observeCurrentCall as jest.Mock).mockReturnValue(of$(call));
            (observeChannel as jest.Mock).mockReturnValue(of$(channel));
            (observeUser as jest.Mock).mockReturnValue(of$(callee));

            const {isDMCall, isDMCalling, dmCalleeId, dmCallee, dmCalleeAnsweredAt} = observeDMCallingState();

            return {
                isDMCall: await firstValueFrom(isDMCall),
                isDMCalling: await firstValueFrom(isDMCalling),
                dmCalleeId: await firstValueFrom(dmCalleeId),
                dmCallee: await firstValueFrom(dmCallee),
                dmCalleeAnsweredAt: await firstValueFrom(dmCalleeAnsweredAt),
            };
        };

        it('should be calling when I own a DM call nobody else has joined', async () => {
            const state = await getState(dmCall);

            expect(state.isDMCall).toBe(true);
            expect(state.isDMCalling).toBe(true);
            expect(state.dmCalleeId).toBe('user2');
            expect(state.dmCallee).toBe(callee);

            // Nothing to count yet, so it falls back to when the call started.
            expect(state.dmCalleeAnsweredAt).toBe(1000);
        });

        it('should stop calling and time from the answer once the other party joins', async () => {
            const state = await getState({
                ...dmCall,
                dmCalleeAnsweredAt: 5000,
                sessions: {
                    ...dmCall.sessions,
                    session2: {sessionId: 'session2', userId: 'user2'},
                },
            });

            expect(state.isDMCalling).toBe(false);
            expect(state.dmCalleeAnsweredAt).toBe(5000);
        });

        it('should not go back to calling after the callee answers and then leaves', async () => {
            // Their session is gone again, but the call was answered, so the ring phase is over.
            const state = await getState({...dmCall, dmCalleeAnsweredAt: 5000});

            expect(state.isDMCalling).toBe(false);
            expect(state.dmCalleeAnsweredAt).toBe(5000);
        });

        it('should not be calling for the callee of the DM call', async () => {
            const state = await getState({...dmCall, ownerId: 'user2', myUserId: 'user1'});

            expect(state.isDMCall).toBe(true);
            expect(state.isDMCalling).toBe(false);
        });

        it('should not be calling until connected to the call', async () => {
            const state = await getState({...dmCall, connected: false});

            expect(state.isDMCalling).toBe(false);
        });

        it('should not be calling in a channel call, and should time from the call start', async () => {
            const state = await getState(
                {...dmCall, dmCalleeAnsweredAt: 5000},
                {type: General.OPEN_CHANNEL, name: 'town-square'},
            );

            expect(state.isDMCall).toBe(false);
            expect(state.isDMCalling).toBe(false);
            expect(state.dmCalleeId).toBe('');
            expect(state.dmCallee).toBeUndefined();
            expect(state.dmCalleeAnsweredAt).toBe(1000);
        });

        it('should not be calling in a DM with myself, since nobody can join', async () => {
            const state = await getState(dmCall, {type: General.DM_CHANNEL, name: 'user1__user1'});

            expect(state.isDMCall).toBe(false);
            expect(state.isDMCalling).toBe(false);
            expect(state.dmCalleeId).toBe('');
            expect(state.dmCallee).toBeUndefined();
        });

        it('should handle there being no call', async () => {
            const state = await getState(null);

            expect(state.isDMCall).toBe(false);
            expect(state.isDMCalling).toBe(false);
            expect(state.dmCalleeId).toBe('');
            expect(state.dmCallee).toBeUndefined();
            expect(state.dmCalleeAnsweredAt).toBe(0);
        });
    });
});
