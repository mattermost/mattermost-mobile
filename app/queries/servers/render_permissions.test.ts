// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {RedactionInvalidationReason, invalidateChannelRedaction} from '@actions/local/redaction';
import {fetchRenderPermissions} from '@actions/remote/render_permissions';
import {RenderPermissionAction} from '@constants/access_control';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import RenderPermissionsStore, {RENDER_PERMISSIONS_TTL_MS} from '@store/render_permissions_store';

import {observeRenderPermission, observeShouldFetchRenderPermissions} from './render_permissions';

import type ServerDataOperator from '@database/operator/server_data_operator';

const serverUrl = 'render-permissions-queries.test.com';
const channelId = 'channelid1';
const upload = RenderPermissionAction.UploadFileAttachment;
const denied = {[upload]: {allowed: false, evaluated: true}};
let operator: ServerDataOperator;

const flush = () => new Promise(process.nextTick);

describe('render permission observables', () => {
    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        await operator.handleConfigs({
            configs: [
                {id: 'Version', value: '12.0.0'},
                {id: 'FeatureFlagPermissionPolicies', value: 'true'},
                {id: 'EnableAttributeBasedAccessControl', value: 'true'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
        const channel = {id: channelId, team_id: 'teamid', total_msg_count: 0} as Channel;
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [channel], myChannels: [{id: channelId, channel_id: channelId, msg_count: 0} as ChannelMembership], prepareRecordsOnly: false});
    });

    afterEach(async () => {
        RenderPermissionsStore.removeServer(serverUrl);
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should follow a stored deny and keep it while an invalidation is revalidated', async () => {
        const values: boolean[] = [];
        const subscription = observeRenderPermission(operator.database, serverUrl, channelId, upload, true).subscribe((v) => values.push(v));
        await flush();

        RenderPermissionsStore.setEntry(serverUrl, channelId, {epoch: 1, decisions: denied}, RENDER_PERMISSIONS_TTL_MS);
        await flush();

        // No flip to the default and back while the new decision is on its way.
        await invalidateChannelRedaction(serverUrl, channelId, RedactionInvalidationReason.ChannelPolicy);
        await flush();

        expect(values).toEqual([true, false]);
        subscription.unsubscribe();
    });

    it('should use the default without subscribing when there is no channel', async () => {
        const values: boolean[] = [];
        observeRenderPermission(operator.database, serverUrl, undefined, upload, false).subscribe((v) => values.push(v));
        await flush();

        expect(values).toEqual([false]);
    });

    it('should ask again when an answer lands already stale, instead of treating it as a repeat', async () => {
        const values: boolean[] = [];
        const subscription = observeShouldFetchRenderPermissions(operator.database, serverUrl, channelId).subscribe((v) => values.push(v));
        await flush();

        await invalidateChannelRedaction(serverUrl, channelId, RedactionInvalidationReason.ChannelPolicy);
        await flush();

        // Requested under the epoch before the invalidation.
        RenderPermissionsStore.setEntry(serverUrl, channelId, {epoch: 1, decisions: denied}, RENDER_PERMISSIONS_TTL_MS);
        await flush();

        RenderPermissionsStore.setEntry(serverUrl, channelId, {epoch: 2, decisions: denied}, RENDER_PERMISSIONS_TTL_MS);
        await flush();

        expect(values).toEqual([true, true, true, false]);
        subscription.unsubscribe();
    });

    it('should end with the decision from after an invalidation that landed while a request was in flight', async () => {
        // Wires the observable to the fetch the way useFetchRenderPermissions does.
        const searchChannelActionDecisions = jest.fn().
            mockImplementationOnce(async () => {
                await invalidateChannelRedaction(serverUrl, channelId, RedactionInvalidationReason.ChannelPolicy);
                return {decisions: {[upload]: {allowed: true, evaluated: true}}};
            }).
            mockResolvedValueOnce({decisions: denied});
        jest.spyOn(NetworkManager, 'getClient').mockReturnValue({searchChannelActionDecisions} as unknown as ReturnType<typeof NetworkManager.getClient>);

        const subscription = observeShouldFetchRenderPermissions(operator.database, serverUrl, channelId).subscribe((shouldFetch) => {
            if (shouldFetch) {
                fetchRenderPermissions(serverUrl, channelId);
            }
        });
        for (let i = 0; i < 10; i++) {
            // eslint-disable-next-line no-await-in-loop
            await flush();
        }

        expect(searchChannelActionDecisions).toHaveBeenCalledTimes(2);
        expect(RenderPermissionsStore.getEntry(serverUrl, channelId)?.decisions).toEqual(denied);
        subscription.unsubscribe();
    });
});
