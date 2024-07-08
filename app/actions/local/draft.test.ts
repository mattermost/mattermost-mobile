// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import DatabaseManager from '@database/manager';

import {
    updateDraftFile,
} from './draft';

import type ServerDataOperator from '@database/operator/server_data_operator';

describe('updateDraftFile', () => {
    let operator: ServerDataOperator;
    const serverUrl = 'baseHandler.test.com';
    const channelId = 'id1';
    const teamId = 'tId1';
    const team: Team = {
        id: teamId,
    } as Team;
    const channel: Channel = {
        id: channelId,
        team_id: teamId,
        total_msg_count: 0,
    } as Channel;
    const channelMember: ChannelMembership = {
        id: 'id',
        channel_id: channelId,
        msg_count: 0,
    } as ChannelMembership;
    const fileInfo: FileInfo = {
        id: 'fileid',
        clientId: 'clientid',
        localPath: 'path1',
    } as FileInfo;
    const draft: Draft = {
        channel_id: channel.id,
        message: 'test',
        root_id: '',
    } as Draft;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('handle not found database', async () => {
        const {error} = await updateDraftFile('foo', channelId, '', fileInfo, false);
        expect(error).toBeTruthy();
    });

    it('handle no draft', async () => {
        const {error} = await updateDraftFile(serverUrl, channelId, '', fileInfo, false);
        expect(error).toBeTruthy();
        expect(error).toBe('no draft');
    });

    it('handle no file', async () => {
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});
        await operator.handleDraft({drafts: [draft], prepareRecordsOnly: false});

        const {error} = await updateDraftFile(serverUrl, channelId, '', fileInfo, false);
        expect(error).toBeTruthy();
        expect(error).toBe('file not found');
    });

    it('update draft file', async () => {
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});
        await operator.handleDraft({drafts: [{...draft, files: [{...fileInfo, localPath: 'path0'}]}], prepareRecordsOnly: false});

        const {draft: draftModel, error} = await updateDraftFile(serverUrl, channelId, '', fileInfo, false);
        expect(error).toBeUndefined();
        expect(draftModel).toBeDefined();
        expect(draftModel?.files?.length).toBe(1);
        expect(draftModel?.files![0].localPath).toBe('path1');
    });
});
