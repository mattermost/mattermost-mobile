// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter, NativeModules} from 'react-native';

import {fetchMyChannelsForTeam} from '@actions/remote/channel';
import {fetchPostsForChannel, fetchPostsForUnreadChannels} from '@actions/remote/post';
import {fetchAllTeams} from '@actions/remote/team';
import {Device} from '@constants';
import DatabaseManager from '@database/manager';
import {queryCurrentTeamId, setCurrentTeamAndChannelId} from '@queries/servers/system';
import {prepareDeleteTeam, queryMyTeamById, removeTeamFromTeamHistory, queryLastChannelFromTeam} from '@queries/servers/team';

import type TeamModel from '@typings/database/models/servers/team';

const {MattermostManaged} = NativeModules;
const isRunningInSplitView = MattermostManaged.isRunningInSplitView;

export const handleTeamChange = async (serverUrl: string, teamId: string) => {
    const {operator, database} = DatabaseManager.serverDatabases[serverUrl];
    const currentTeamId = await queryCurrentTeamId(database);

    if (currentTeamId === teamId) {
        return;
    }

    let channelId = '';
    if (Device.IS_TABLET) {
        const {isSplitView} = await isRunningInSplitView();
        if (!isSplitView) {
            channelId = await queryLastChannelFromTeam(database, teamId);
            if (channelId) {
                fetchPostsForChannel(serverUrl, channelId);
            }
        }
    }
    setCurrentTeamAndChannelId(operator, teamId, channelId);

    const {channels, memberships, error} = await fetchMyChannelsForTeam(serverUrl, teamId);
    if (error) {
        DeviceEventEmitter.emit('team_load_error', serverUrl, error);
    }

    if (channels?.length && memberships?.length) {
        fetchPostsForUnreadChannels(serverUrl, channels, memberships, channelId);
    }
};

export const localRemoveUserFromTeam = async (serverUrl: string, teamId: string) => {
    const serverDatabase = DatabaseManager.serverDatabases[serverUrl];
    if (!serverDatabase) {
        return;
    }

    const {operator, database} = serverDatabase;

    const myTeam = await queryMyTeamById(database, teamId);
    if (myTeam) {
        const team = await myTeam.team.fetch() as TeamModel;
        const models = await prepareDeleteTeam(team);
        const system = await removeTeamFromTeamHistory(operator, team.id);
        if (system) {
            models.push(...system);
        }
        if (models.length) {
            await operator.batchRecords(models);
        }

        fetchAllTeams(serverUrl);
    }
};
