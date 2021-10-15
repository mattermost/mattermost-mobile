// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NativeModules} from 'react-native';

import {fetchPostsForChannel} from '@actions/remote/post';
import {Device} from '@constants';
import DatabaseManager from '@database/manager';
import {queryCurrentTeamId, setCurrentTeamAndChannelId} from '@queries/servers/system';
import {queryLastChannelFromTeam} from '@queries/servers/team';

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
};
