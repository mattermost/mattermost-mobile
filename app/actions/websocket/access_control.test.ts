// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {getRedactionEpochState, getRequiredRedactionEpoch} from '@actions/local/redaction';
import {refetchPostsForRedaction} from '@actions/remote/post';
import {Events} from '@constants';
import DatabaseManager from '@database/manager';
import EphemeralStore from '@store/ephemeral_store';
import {advanceTimers, disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';

import {
    clearRedactionInvalidations,
    handleChannelAccessControlUpdatedEvent,
    handlePermissionPolicyUpdatedEvent,
    handleRedactionForPropertyValuesUpdated,
    invalidateRedactionForChannelMembership,
    invalidateRedactionForCurrentUser,
    invalidateRedactionOnFirstConnect,
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

    it('should close any open viewer, which cannot observe the database', async () => {
        const listener = jest.fn();
        const subscription = DeviceEventEmitter.addListener(Events.CLOSE_GALLERY, listener);

        handlePermissionPolicyUpdatedEvent(serverUrl);
        await flushCoalescer();
        subscription.remove();

        expect(listener).toHaveBeenCalled();
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

    it('should advance immediately and without coalescing on first connect', async () => {
        // The reconnect path fetches the visible channel right after, and that fetch must capture the
        // raised epoch rather than the one it is replacing.
        await invalidateRedactionOnFirstConnect(serverUrl);

        expect(await getRequiredRedactionEpoch(operator.database)).toBeGreaterThan(1);
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
