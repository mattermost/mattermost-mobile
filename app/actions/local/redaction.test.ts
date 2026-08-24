// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {firstValueFrom} from 'rxjs';
import {take, toArray} from 'rxjs/operators';

import {SYSTEM_IDENTIFIERS, MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';

import {
    DEFAULT_REDACTION_EPOCH_STATE,
    RedactionInvalidationReason,
    captureRedactionEpoch,
    isRedactionEpochCurrent,
    getRedactionEpochState,
    getRequiredRedactionEpoch,
    invalidateChannelRedaction,
    invalidateRedactionGlobally,
    isPostRedactionVerified,
    isRedactionEnforced,
    observeRequiredRedactionEpoch,
} from './redaction';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type MyChannelModel from '@typings/database/models/servers/my_channel';

const serverUrl = 'redaction.test.com';
const channelId = 'channelid1';
const otherChannelId = 'channelid2';
let operator: ServerDataOperator;

const {SERVER: {MY_CHANNEL}} = MM_TABLES;

const seedMyChannel = async (id: string) => {
    const channel = {id, team_id: 'teamid', total_msg_count: 0} as Channel;
    const member = {id, channel_id: id, msg_count: 0} as ChannelMembership;
    await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
    await operator.handleMyChannel({channels: [channel], myChannels: [member], prepareRecordsOnly: false});
};

const readMyChannel = (id: string) => {
    return operator.database.get<MyChannelModel>(MY_CHANNEL).find(id);
};

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('redaction epoch state', () => {
    it('should report a positive required epoch before any System row exists', async () => {
        // The migration leaves cached posts at 0, so the floor has to be above 0 or every legacy
        // row would read as verified.
        const state = await getRedactionEpochState(operator.database);
        expect(state).toEqual(DEFAULT_REDACTION_EPOCH_STATE);
        expect(await getRequiredRedactionEpoch(operator.database)).toBe(1);
        expect(isPostRedactionVerified(0, 1)).toBe(false);
    });

    it('should fall back to the default when the stored value is malformed', async () => {
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.REDACTION_EPOCH, value: {counter: -3, global: 'nope'}}],
            prepareRecordsOnly: false,
        });

        expect(await getRedactionEpochState(operator.database)).toEqual(DEFAULT_REDACTION_EPOCH_STATE);
    });

    it('should advance monotonically and distinctly under concurrent invalidations', async () => {
        const results = await Promise.all([
            invalidateRedactionGlobally(serverUrl, RedactionInvalidationReason.GlobalPolicy),
            invalidateRedactionGlobally(serverUrl, RedactionInvalidationReason.UserAttributes),
            invalidateRedactionGlobally(serverUrl, RedactionInvalidationReason.UserRoles),
        ]);

        expect(new Set(results).size).toBe(3);
        expect(Math.max(...results as number[])).toBe(await getRequiredRedactionEpoch(operator.database));
        expect(results.every((r) => (r ?? 0) > 1)).toBe(true);
    });

    it('should raise only the affected channel for a channel-scoped invalidation', async () => {
        await seedMyChannel(channelId);
        await seedMyChannel(otherChannelId);

        const globalBefore = (await getRedactionEpochState(operator.database)).global;
        const epoch = await invalidateChannelRedaction(serverUrl, channelId, RedactionInvalidationReason.ChannelPolicy);

        expect(await getRequiredRedactionEpoch(operator.database, channelId)).toBe(epoch);
        expect(await getRequiredRedactionEpoch(operator.database, otherChannelId)).toBe(globalBefore);
        expect((await getRedactionEpochState(operator.database)).global).toBe(globalBefore);
        expect((await readMyChannel(otherChannelId)).redactionRequiredEpoch).toBe(0);
    });

    it('should raise every channel for a global invalidation', async () => {
        await seedMyChannel(channelId);
        await invalidateChannelRedaction(serverUrl, channelId, RedactionInvalidationReason.ChannelPolicy);

        const epoch = await invalidateRedactionGlobally(serverUrl, RedactionInvalidationReason.GlobalPolicy);

        expect(await getRequiredRedactionEpoch(operator.database, channelId)).toBe(epoch);
        expect(await getRequiredRedactionEpoch(operator.database, otherChannelId)).toBe(epoch);
    });

    it('should still advance the counter when the channel has no membership row', async () => {
        const epoch = await invalidateChannelRedaction(serverUrl, 'deletedchannel', RedactionInvalidationReason.ChannelPolicy);

        expect(epoch).toBeGreaterThan(1);
        expect((await getRedactionEpochState(operator.database)).counter).toBe(epoch);
    });

    it('should read the epoch back out of the database rather than from memory', async () => {
        // Process death is what the in-memory stale-channel set could not survive, so the epoch must
        // come from the System row on every read. Tests run on an in-memory adapter, so an actual
        // relaunch cannot be simulated here; writing the row behind the service's back and seeing the
        // new value is the observable half of that property.
        await invalidateRedactionGlobally(serverUrl, RedactionInvalidationReason.GlobalPolicy);
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.REDACTION_EPOCH, value: {counter: 41, global: 41}}],
            prepareRecordsOnly: false,
        });

        expect(await getRequiredRedactionEpoch(operator.database)).toBe(41);
        expect(await invalidateRedactionGlobally(serverUrl, RedactionInvalidationReason.GlobalPolicy)).toBe(42);
    });
});

describe('isRedactionEnforced', () => {
    const storeConfigValues = async (values: Record<string, string>) => {
        await operator.handleConfigs({
            configs: Object.entries(values).map(([id, value]) => ({id, value})),
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
    };

    it('should require both the feature flag and the config setting', async () => {
        expect(await isRedactionEnforced(operator.database)).toBe(false);

        await storeConfigValues({FeatureFlagPermissionPolicies: 'true'});
        expect(await isRedactionEnforced(operator.database)).toBe(false);

        await storeConfigValues({EnableAttributeBasedAccessControl: 'true'});
        expect(await isRedactionEnforced(operator.database)).toBe(true);

        await storeConfigValues({FeatureFlagPermissionPolicies: 'false'});
        expect(await isRedactionEnforced(operator.database)).toBe(false);
    });
});

describe('captureRedactionEpoch / isRedactionEpochCurrent', () => {
    const enable = async () => {
        await operator.handleConfigs({
            configs: [
                {id: 'FeatureFlagPermissionPolicies', value: 'true'},
                {id: 'EnableAttributeBasedAccessControl', value: 'true'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
    };

    it('should capture nothing while the server is not enforcing policies', async () => {
        // A server without ABAC must behave exactly as it did before this feature existed: no epoch
        // is stamped, so no post is ever gated.
        expect(await captureRedactionEpoch(serverUrl, channelId)).toBeUndefined();
        expect(await isRedactionEpochCurrent(serverUrl, undefined, channelId)).toBe(true);
    });

    it('should treat a captured epoch as stale once an invalidation lands', async () => {
        await enable();
        await seedMyChannel(channelId);

        const captured = await captureRedactionEpoch(serverUrl, channelId);
        expect(captured).toBe(1);
        expect(await isRedactionEpochCurrent(serverUrl, captured, channelId)).toBe(true);

        await invalidateChannelRedaction(serverUrl, channelId, RedactionInvalidationReason.ChannelPolicy);

        expect(await isRedactionEpochCurrent(serverUrl, captured, channelId)).toBe(false);
    });

    it('should not treat a channel invalidation as superseding another channel', async () => {
        await enable();
        await seedMyChannel(channelId);
        await seedMyChannel(otherChannelId);

        const captured = await captureRedactionEpoch(serverUrl, otherChannelId);
        await invalidateChannelRedaction(serverUrl, channelId, RedactionInvalidationReason.ChannelPolicy);

        expect(await isRedactionEpochCurrent(serverUrl, captured, otherChannelId)).toBe(true);
    });

    it('should fail closed when the database cannot be read', async () => {
        await enable();
        expect(await isRedactionEpochCurrent('no.such.server', 5, channelId)).toBe(false);
    });
});

describe('observeRequiredRedactionEpoch', () => {
    it('should return the same stream for the same channel so rows share one subscription', () => {
        const first = observeRequiredRedactionEpoch(operator.database, channelId);

        expect(observeRequiredRedactionEpoch(operator.database, channelId)).toBe(first);
        expect(observeRequiredRedactionEpoch(operator.database, otherChannelId)).not.toBe(first);
    });

    it('should emit the max of the global and channel epochs', async () => {
        await seedMyChannel(channelId);

        const emissions = firstValueFrom(
            observeRequiredRedactionEpoch(operator.database, channelId).pipe(take(3), toArray()),
        );

        const channelEpoch = await invalidateChannelRedaction(serverUrl, channelId, RedactionInvalidationReason.ChannelPolicy);
        const globalEpoch = await invalidateRedactionGlobally(serverUrl, RedactionInvalidationReason.GlobalPolicy);

        expect(await emissions).toEqual([1, channelEpoch, globalEpoch]);
    });
});
