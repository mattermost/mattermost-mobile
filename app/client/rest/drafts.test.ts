// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';

import type ClientBase from './base';
import type {ClientDraftsMix} from './drafts';

describe('ClientDrafts', () => {
    let client: ClientDraftsMix & ClientBase;
    const draft: DraftUpsertRequest = {
        channel_id: 'channel_id',
        root_id: '',
        message: 'draft message',
        type: '',
        props: {},
        file_ids: [],
    };

    beforeAll(() => {
        client = TestHelper.createClient();
        client.doFetch = jest.fn();
    });

    test('getDrafts', async () => {
        const teamId = 'team_id';
        const groupLabel = 'WebSocket Reconnect';
        const expectedUrl = client.getUserTeamDraftsRoute('me', teamId);
        const expectedOptions = {
            method: 'get',
            groupLabel,
        };

        await client.getDrafts(teamId, groupLabel);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('upsertDraft', async () => {
        await client.upsertDraft(draft, 'connection_id');

        const expectedUrl = client.getDraftsRoute();
        const expectedOptions = {
            method: 'post',
            body: draft,
            headers: {'Connection-Id': 'connection_id'},
        };
        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('upsertDraft without connection ID', async () => {
        await client.upsertDraft(draft);

        const expectedUrl = client.getDraftsRoute();
        const expectedOptions = {
            method: 'post',
            body: draft,
            headers: {},
        };
        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('deleteDraft for a channel draft (empty rootId) hits the channel route', async () => {
        const channelId = 'channel_id';
        const connectionId = 'connection_id';
        const expectedUrl = client.getUserChannelDraftsRoute('me', channelId);
        const expectedOptions = {
            method: 'delete',
            headers: {'Connection-Id': connectionId},
        };

        await client.deleteDraft(channelId, '', connectionId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('deleteDraft for a thread draft (non-empty rootId) hits the thread route', async () => {
        const channelId = 'channel_id';
        const rootId = 'root_id';
        const expectedUrl = client.getUserThreadDraftRoute('me', channelId, rootId);
        const expectedOptions = {
            method: 'delete',
            headers: {},
        };

        await client.deleteDraft(channelId, rootId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });
});
