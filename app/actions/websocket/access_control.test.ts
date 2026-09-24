// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {getRedactionEpochState, getRequiredRedactionEpoch} from '@actions/local/redaction';
import {refetchPostsForRedaction} from '@actions/remote/post';
import {Events, WebsocketEvents} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import EphemeralStore from '@store/ephemeral_store';
import {advanceTimers, disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';

import {
    clearRedactionInvalidations,
    handleChannelAccessControlUpdatedEvent,
    handlePermissionPolicyUpdatedEvent,
    handleRedactionForPropertyFieldChanged,
    handleRedactionForPropertyValuesUpdated,
    invalidateRedactionForChannelMembership,
    invalidateRedactionForCurrentUser,
    invalidateRedactionOnResync,
} from './access_control';

import type ServerDataOperator from '@database/operator/server_data_operator';

jest.mock('@actions/remote/post', () => ({
    refetchPostsForRedaction: jest.fn(() => Promise.resolve({})),
    fetchPostThread: jest.fn(() => Promise.resolve({posts: []})),
}));

const serverUrl = 'access-control.test.com';
const otherServerUrl = 'other-access-control.test.com';
const channelId = 'channelid1';
const otherChannelId = 'channelid2';
const currentUserId = 'userid1';

let operator: ServerDataOperator;

const enableAbac = async (op: ServerDataOperator) => {
    await op.handleConfigs({
        configs: [
            {id: 'FeatureFlagPermissionPolicies', value: 'true'},
            {id: 'EnableAttributeBasedAccessControl', value: 'true'},
        ],
        configsToDelete: [],
        prepareRecordsOnly: false,
    });
};

const seedMyChannel = async (op: ServerDataOperator, id: string) => {
    const channel = {id, team_id: 'teamid', total_msg_count: 0} as Channel;
    const member = {id, channel_id: id, msg_count: 0} as ChannelMembership;
    await op.handleChannel({channels: [channel], prepareRecordsOnly: false});
    await op.handleMyChannel({channels: [channel], myChannels: [member], prepareRecordsOnly: false});
};

// The trigger reads the feature predicate from the database before it schedules anything, so the
// timer does not exist yet when the call returns. Drain pending work first, then advance, then drain
// again for the invalidation the timer starts.
const flushCoalescer = async () => {
    await advanceTimers(0);
    await advanceTimers(COALESCE_WINDOW_MS + 50);
    await advanceTimers(0);
};

const flushAttributeViewRetry = async () => {
    await advanceTimers(ATTRIBUTE_VIEW_RETRY_MS + ATTRIBUTE_VIEW_RETRY_JITTER_MS + 100);
    await advanceTimers(0);
};

const COALESCE_WINDOW_MS = 250;
const ATTRIBUTE_VIEW_RETRY_MS = 32000;
const ATTRIBUTE_VIEW_RETRY_JITTER_MS = 3000;

beforeEach(async () => {
    enableFakeTimers();
    await DatabaseManager.init([serverUrl]);
    operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    await enableAbac(operator);
    await operator.handleSystem({
        systems: [{id: 'currentUserId', value: currentUserId}],
        prepareRecordsOnly: false,
    });
    jest.mocked(refetchPostsForRedaction).mockClear();
});

afterEach(async () => {
    jest.restoreAllMocks();
    clearRedactionInvalidations(serverUrl);
    clearRedactionInvalidations(otherServerUrl);
    await DatabaseManager.destroyServerDatabase(serverUrl);
    disableFakeTimers();
});

describe('redaction invalidation triggers', () => {
    it('should not advance anything while the server is not enforcing policies', async () => {
        await operator.handleConfigs({
            configs: [{id: 'EnableAttributeBasedAccessControl', value: 'false'}],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        handlePermissionPolicyUpdatedEvent(serverUrl);
        await flushCoalescer();

        expect((await getRedactionEpochState(operator.database)).counter).toBe(1);
    });

    it('should raise the global epoch for a permission policy change', async () => {
        handlePermissionPolicyUpdatedEvent(serverUrl);
        await flushCoalescer();

        expect(await getRequiredRedactionEpoch(operator.database)).toBeGreaterThan(1);
    });

    it('should raise only the named channel for a channel policy change', async () => {
        await seedMyChannel(operator, channelId);
        await seedMyChannel(operator, otherChannelId);

        handleChannelAccessControlUpdatedEvent(serverUrl, {broadcast: {channel_id: channelId}} as WebSocketMessage);
        await flushCoalescer();

        const globalEpoch = (await getRedactionEpochState(operator.database)).global;
        expect(await getRequiredRedactionEpoch(operator.database, channelId)).toBeGreaterThan(globalEpoch);
        expect(await getRequiredRedactionEpoch(operator.database, otherChannelId)).toBe(globalEpoch);
    });

    it('should read the channel id from the payload when the broadcast omits it', async () => {
        await seedMyChannel(operator, channelId);

        handleChannelAccessControlUpdatedEvent(serverUrl, {
            broadcast: {},
            data: {channel: JSON.stringify({id: channelId})},
        } as unknown as WebSocketMessage);
        await flushCoalescer();

        expect(await getRequiredRedactionEpoch(operator.database, channelId)).toBeGreaterThan(1);
    });

    it('should collapse the duplicate events one CPA write emits into a single generation', async () => {
        // A CPA API write emits both custom_profile_attributes_values_updated and the generic
        // property_values_updated; without coalescing that is two epochs and two refetches.
        invalidateRedactionForCurrentUser(serverUrl, 'user_attributes');
        await handleRedactionForPropertyValuesUpdated(serverUrl, {
            data: {object_type: 'user', target_id: currentUserId},
        } as unknown as WebSocketMessage);
        await flushCoalescer();

        expect((await getRedactionEpochState(operator.database)).counter).toBe(2);
    });

    it('should start a new batch for an event arriving after the window closed', async () => {
        invalidateRedactionForCurrentUser(serverUrl, 'user_attributes');
        await flushCoalescer();
        invalidateRedactionForCurrentUser(serverUrl, 'user_roles');
        await flushCoalescer();

        expect((await getRedactionEpochState(operator.database)).counter).toBe(3);
    });

    it('should not coalesce a channel invalidation into a global one', async () => {
        await seedMyChannel(operator, channelId);

        invalidateRedactionForCurrentUser(serverUrl, 'user_attributes');
        invalidateRedactionForChannelMembership(serverUrl, channelId);
        await flushCoalescer();

        expect((await getRedactionEpochState(operator.database)).counter).toBe(3);
    });

    it('should ignore a property change that belongs to another user', async () => {
        await handleRedactionForPropertyValuesUpdated(serverUrl, {
            data: {object_type: 'user', target_id: 'someone-else'},
        } as unknown as WebSocketMessage);
        await flushCoalescer();

        expect((await getRedactionEpochState(operator.database)).counter).toBe(1);
    });

    it('should raise the global epoch when every value of a field is cleared', async () => {
        // The payload names only the field, so it cannot be told apart from a user attribute.
        await handleRedactionForPropertyValuesUpdated(serverUrl, {
            data: {field_id: 'fieldid1', values: '[]'},
        } as unknown as WebSocketMessage);
        await flushCoalescer();

        expect((await getRedactionEpochState(operator.database)).global).toBe(2);
    });

    it('should raise the global epoch when a user attribute field changes', async () => {
        // An option rename rewrites every subject's value with no values event to follow.
        handleRedactionForPropertyFieldChanged(serverUrl, {
            event: WebsocketEvents.PROPERTY_FIELD_UPDATED,
            data: {object_type: 'user', property_field: JSON.stringify({id: 'fieldid1', object_type: 'user'})},
        } as unknown as WebSocketMessage);
        await flushCoalescer();

        expect((await getRedactionEpochState(operator.database)).global).toBe(2);
    });

    it('should raise the global epoch when the session attribute manifest changes, including a new field', async () => {
        // The manifest decides which attributes every request carries, so even a new field changes
        // the session subject from the next request on.
        handleRedactionForPropertyFieldChanged(serverUrl, {
            event: WebsocketEvents.PROPERTY_FIELD_CREATED,
            data: {object_type: 'session', property_field: JSON.stringify({id: 'fieldid3', object_type: 'session'})},
        } as unknown as WebSocketMessage);
        await flushCoalescer();

        expect((await getRedactionEpochState(operator.database)).global).toBe(2);
    });

    it('should ignore field changes that cannot alter a subject', async () => {
        handleRedactionForPropertyFieldChanged(serverUrl, {
            event: WebsocketEvents.PROPERTY_FIELD_CREATED,
            data: {object_type: 'user', property_field: JSON.stringify({id: 'fieldid1', object_type: 'user'})},
        } as unknown as WebSocketMessage);
        handleRedactionForPropertyFieldChanged(serverUrl, {
            event: WebsocketEvents.PROPERTY_FIELD_UPDATED,
            data: {object_type: 'channel', property_field: JSON.stringify({id: 'fieldid2', object_type: 'channel'})},
        } as unknown as WebSocketMessage);
        await flushCoalescer();

        expect((await getRedactionEpochState(operator.database)).counter).toBe(1);
    });

    describe('channel attributes', () => {
        const accessControlGroupId = 'accesscontrolgroupid';
        const channelValuesEvent = (groupId: string) => ({
            data: {
                object_type: 'channel',
                target_id: channelId,
                values: JSON.stringify([{id: 'valueid1', field_id: 'fieldid1', target_id: channelId, group_id: groupId}]),
            },
        } as unknown as WebSocketMessage);

        beforeEach(async () => {
            await seedMyChannel(operator, channelId);
            await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.ACCESS_CONTROL_GROUP_ID, value: accessControlGroupId}], prepareRecordsOnly: false});
        });

        it('should raise only that channel when its access control attribute values change', async () => {
            // Channel attribute values are the resource side of the channel's policies.
            await handleRedactionForPropertyValuesUpdated(serverUrl, channelValuesEvent(accessControlGroupId));
            await flushCoalescer();

            const state = await getRedactionEpochState(operator.database);
            expect(state.global).toBe(1);
            expect(await getRequiredRedactionEpoch(operator.database, channelId)).toBe(2);
        });

        it('should ignore channel values written by another property group', async () => {
            // Managed channel categories keep per-channel values in the same tables.
            await handleRedactionForPropertyValuesUpdated(serverUrl, channelValuesEvent('managedcategoriesgroupid'));
            await flushCoalescer();

            expect((await getRedactionEpochState(operator.database)).counter).toBe(1);
        });

        it('should raise only that channel when every value on it is cleared', async () => {
            // A clear of every value on a target names no group, so it cannot be told apart from an
            // access control write.
            await handleRedactionForPropertyValuesUpdated(serverUrl, {
                data: {object_type: 'channel', target_id: channelId, values: '[]'},
            } as unknown as WebSocketMessage);
            await flushCoalescer();

            const state = await getRedactionEpochState(operator.database);
            expect(state.global).toBe(1);
            expect(await getRequiredRedactionEpoch(operator.database, channelId)).toBe(2);
        });

        it('should raise the global epoch when an access control channel attribute field is edited', async () => {
            // The payload does not say which channels hold a value for the field.
            await handleRedactionForPropertyFieldChanged(serverUrl, {
                event: WebsocketEvents.PROPERTY_FIELD_UPDATED,
                data: {object_type: 'channel', property_field: JSON.stringify({id: 'fieldid2', object_type: 'channel', group_id: accessControlGroupId})},
            } as unknown as WebSocketMessage);
            await flushCoalescer();

            expect((await getRedactionEpochState(operator.database)).global).toBe(2);
        });
    });

    it('should close any open viewer, which cannot observe the database', async () => {
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(serverUrl);
        const listener = jest.fn();
        const subscription = DeviceEventEmitter.addListener(Events.CLOSE_GALLERY, listener);

        handlePermissionPolicyUpdatedEvent(serverUrl);
        await flushCoalescer();
        subscription.remove();

        expect(listener).toHaveBeenCalled();
    });

    it('should leave a viewer open when the change cannot affect what it shows', async () => {
        // A background server, or a channel-scoped change for a channel other than the viewed post's.
        const listener = jest.fn();
        const subscription = DeviceEventEmitter.addListener(Events.CLOSE_GALLERY, listener);
        await seedMyChannel(operator, channelId);
        await operator.handlePosts({
            actionType: 'POSTS.RECEIVED_NEW',
            order: ['viewed-post'],
            posts: [{id: 'viewed-post', channel_id: otherChannelId, create_at: 1, update_at: 1, delete_at: 0, message: '', user_id: currentUserId, metadata: {}} as unknown as Post],
            prepareRecordsOnly: false,
        });
        jest.spyOn(EphemeralStore, 'getCurrentFileViewerPostId').mockReturnValue('viewed-post');
        const activeServer = jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue('some.other.server');

        handlePermissionPolicyUpdatedEvent(serverUrl);
        await flushCoalescer();
        activeServer.mockResolvedValue(serverUrl);
        handleChannelAccessControlUpdatedEvent(serverUrl, {broadcast: {channel_id: channelId}} as WebSocketMessage);
        await flushCoalescer();
        subscription.remove();

        expect(listener).not.toHaveBeenCalled();
    });

    it('should raise a burst of channel policy changes in one write', async () => {
        // A parent policy save sends one event per child channel.
        await seedMyChannel(operator, channelId);
        await seedMyChannel(operator, otherChannelId);

        handleChannelAccessControlUpdatedEvent(serverUrl, {broadcast: {channel_id: channelId}} as WebSocketMessage);
        handleChannelAccessControlUpdatedEvent(serverUrl, {broadcast: {channel_id: otherChannelId}} as WebSocketMessage);
        await flushCoalescer();

        const state = await getRedactionEpochState(operator.database);
        expect(state.counter).toBe(2);
        expect(state.global).toBe(1);
        expect(await getRequiredRedactionEpoch(operator.database, channelId)).toBe(2);
        expect(await getRequiredRedactionEpoch(operator.database, otherChannelId)).toBe(2);
    });

    it('should refresh the visible channel without waiting to be rendered', async () => {
        await operator.handleSystem({
            systems: [{id: 'currentChannelId', value: channelId}],
            prepareRecordsOnly: false,
        });
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(serverUrl);

        handlePermissionPolicyUpdatedEvent(serverUrl);
        await flushCoalescer();

        expect(refetchPostsForRedaction).toHaveBeenCalledWith(serverUrl, channelId);
    });

    it('should not refetch for a server the user is not looking at', async () => {
        await operator.handleSystem({
            systems: [{id: 'currentChannelId', value: channelId}],
            prepareRecordsOnly: false,
        });
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue('some.other.server');

        handlePermissionPolicyUpdatedEvent(serverUrl);
        await flushCoalescer();

        expect(refetchPostsForRedaction).not.toHaveBeenCalled();
        expect(await getRequiredRedactionEpoch(operator.database)).toBeGreaterThan(1);
    });

    it('should advance immediately and without coalescing on resync', async () => {
        // The reconnect path fetches the visible channel right after, and that fetch must capture the
        // raised epoch rather than the one it is replacing.
        await invalidateRedactionOnResync(serverUrl);

        expect(await getRequiredRedactionEpoch(operator.database)).toBeGreaterThan(1);
    });

    it('should raise the epoch on resync even while policies are not enforced', async () => {
        // ABAC may have been turned off while events were lost; cached denials must still be re-checked.
        await operator.handleConfigs({
            configs: [{id: 'EnableAttributeBasedAccessControl', value: 'false'}],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        await invalidateRedactionOnResync(serverUrl);

        expect((await getRedactionEpochState(operator.database)).global).toBe(2);
    });

    it('should keep pending work isolated between servers', async () => {
        await DatabaseManager.init([otherServerUrl]);
        const otherOperator = DatabaseManager.serverDatabases[otherServerUrl]!.operator;
        await enableAbac(otherOperator);

        invalidateRedactionForCurrentUser(serverUrl, 'user_attributes');
        invalidateRedactionForCurrentUser(otherServerUrl, 'user_attributes');

        // Logging out of one server must not discard the other's queued invalidation.
        clearRedactionInvalidations(serverUrl);
        await flushCoalescer();

        expect((await getRedactionEpochState(operator.database)).counter).toBe(1);
        expect((await getRedactionEpochState(otherOperator.database)).counter).toBe(2);

        await DatabaseManager.destroyServerDatabase(otherServerUrl);
    });
});

describe('epoch write failure', () => {
    it('should retry an invalidation whose epoch write failed instead of dropping it', async () => {
        // A dropped write would leave every cached decision trusted.
        const redaction = jest.requireActual<typeof import('@actions/local/redaction')>('@actions/local/redaction');
        const spy = jest.spyOn(redaction, 'invalidateRedactionGlobally').mockResolvedValueOnce(undefined);

        handlePermissionPolicyUpdatedEvent(serverUrl);
        await flushCoalescer();
        expect((await getRedactionEpochState(operator.database)).counter).toBe(1);

        await advanceTimers(2000);
        await advanceTimers(0);

        expect((await getRedactionEpochState(operator.database)).counter).toBe(2);
        spy.mockRestore();
    });
});

describe('attribute view convergence retry', () => {
    it('should re-evaluate once after the server attribute view refresh window', async () => {
        // The server's materialized attribute view is up to 30s stale and its marker is node-local,
        // so the first evaluation after an attribute write can still see the old attributes.
        invalidateRedactionForCurrentUser(serverUrl, 'user_attributes', true);
        await flushCoalescer();
        const afterFirst = (await getRedactionEpochState(operator.database)).counter;

        await flushAttributeViewRetry();

        expect((await getRedactionEpochState(operator.database)).counter).toBe(afterFirst + 1);
    });

    it('should skip the retry when a newer invalidation already forced a re-evaluation', async () => {
        invalidateRedactionForCurrentUser(serverUrl, 'user_attributes', true);
        await flushCoalescer();
        const afterFirst = (await getRedactionEpochState(operator.database)).counter;

        handlePermissionPolicyUpdatedEvent(serverUrl);
        await flushCoalescer();
        const afterSecond = (await getRedactionEpochState(operator.database)).counter;

        await flushAttributeViewRetry();

        expect(afterSecond).toBe(afterFirst + 1);
        expect((await getRedactionEpochState(operator.database)).counter).toBe(afterSecond);
    });
});

describe('EphemeralStore interaction', () => {
    it('should refresh an open thread with a full fetch', async () => {
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(serverUrl);
        jest.spyOn(EphemeralStore, 'getCurrentThreadId').mockReturnValue('rootpostid');

        const {fetchPostThread} = require('@actions/remote/post');
        handlePermissionPolicyUpdatedEvent(serverUrl);
        await flushCoalescer();

        // No pagination options: an incremental thread fetch cannot re-deliver a cached reply whose
        // only change was its redaction state.
        expect(fetchPostThread).toHaveBeenCalledWith(serverUrl, 'rootpostid');
    });
});
