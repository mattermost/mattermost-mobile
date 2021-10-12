// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';

import {fetchChannelByName, fetchMyChannelsForTeam, joinChannel, markChannelAsViewed} from '@actions/remote/channel';
import {fetchPostsForChannel} from '@actions/remote/post';
import {fetchRolesIfNeeded} from '@actions/remote/role';
import {addUserToTeam, fetchTeamByName, removeUserFromTeam} from '@actions/remote/team';
import {General} from '@constants';
import DatabaseManager from '@database/manager';
import {privateChannelJoinPrompt} from '@helpers/api/channel';
import {prepareMyChannelsForTeam, queryMyChannel} from '@queries/servers/channel';
import {queryCommonSystemValues, setCurrentChannelId, setCurrentTeamAndChannelId} from '@queries/servers/system';
import {addChannelToTeamHistory, prepareMyTeams, queryMyTeamById, queryTeamById, queryTeamByName} from '@queries/servers/team';
import {PERMALINK_GENERIC_TEAM_NAME_REDIRECT} from '@utils/url';

import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type MyTeamModel from '@typings/database/models/servers/my_team';
import type TeamModel from '@typings/database/models/servers/team';
import type {IntlShape} from 'react-intl';

export const switchToChannel = async (serverUrl: string, channelId: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const dt = Date.now();
        const system = await queryCommonSystemValues(database);
        const member = await queryMyChannel(database, channelId);

        if (member) {
            fetchPostsForChannel(serverUrl, channelId);

            const channel: ChannelModel = await member.channel.fetch();
            const {operator} = DatabaseManager.serverDatabases[serverUrl];
            const result = await setCurrentChannelId(operator, channelId);

            let previousChannelId: string | undefined;
            if (system.currentChannelId !== channelId) {
                previousChannelId = system.currentChannelId;
                await addChannelToTeamHistory(operator, system.currentTeamId, channelId, false);
            }
            await markChannelAsViewed(serverUrl, channelId, previousChannelId, true);

            if (!result.error) {
                console.log('channel switch to', channel?.displayName, channelId, (Date.now() - dt), 'ms'); //eslint-disable-line
            }
        }
    } catch (error) {
        return {error};
    }

    return {error: undefined};
};

export const switchToChannelByName = async (serverUrl: string, channelName: string, teamName: string, errorHandler: (intl: IntlShape) => void, intl: IntlShape) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        let myChannel: MyChannelModel | ChannelMembership | undefined;
        let team: TeamModel | Team | undefined;
        let myTeam: MyTeamModel | TeamMembership | undefined;
        let name = teamName;
        const roles: string [] = [];
        const system = await queryCommonSystemValues(database);
        const currentTeam = await queryTeamById(database, system.currentTeamId);

        if (name === PERMALINK_GENERIC_TEAM_NAME_REDIRECT) {
            name = currentTeam!.name;
        } else {
            team = await queryTeamByName(database, teamName);
        }

        if (!team) {
            const fetchTeam = await fetchTeamByName(serverUrl, name, true);
            if (fetchTeam.error) {
                errorHandler(intl);
                return {error: fetchTeam.error};
            }

            team = fetchTeam.team!;
        }

        let joinedNewTeam = false;
        myTeam = await queryMyTeamById(database, team.id);
        if (!myTeam) {
            const added = await addUserToTeam(serverUrl, team.id, system.currentUserId, true);
            if (added.error) {
                errorHandler(intl);
                return {error: added.error};
            }
            myTeam = added.member!;
            roles.push(...myTeam.roles.split(' '));
            joinedNewTeam = true;
        }

        if (!myTeam) {
            errorHandler(intl);
            return {error: 'Could not fetch team member'};
        }

        let isArchived = false;
        const chReq = await fetchChannelByName(serverUrl, team.id, channelName);
        if (chReq.error) {
            errorHandler(intl);
            return {error: chReq.error};
        }
        const channel = chReq.channel;
        if (!channel) {
            errorHandler(intl);
            return {error: 'Could not fetch channel'};
        }

        isArchived = channel.delete_at > 0;
        if (isArchived && system.config.ExperimentalViewArchivedChannels !== 'true') {
            errorHandler(intl);
            return {error: 'Channel is archived'};
        }

        myChannel = await queryMyChannel(database, channel.id);

        if (!myChannel) {
            if (channel.type === General.PRIVATE_CHANNEL) {
                const displayName = channel.display_name;
                const {join} = await privateChannelJoinPrompt(displayName, intl);
                if (!join) {
                    if (joinedNewTeam) {
                        await removeUserFromTeam(serverUrl, team.id, system.currentUserId, true);
                    }
                    errorHandler(intl);
                    return {error: 'Refused to join Private channel'};
                }
                console.log('joining channel', displayName, channel.id); //eslint-disable-line
                const result = await joinChannel(serverUrl, system.currentUserId, team.id, channel.id, undefined, true);
                if (result.error || !result.channel) {
                    if (joinedNewTeam) {
                        await removeUserFromTeam(serverUrl, team.id, system.currentUserId, true);
                    }

                    errorHandler(intl);
                    return {error: result.error};
                }

                myChannel = result.member!;
                roles.push(...myChannel.roles.split(' '));
            }
        }

        if (!myChannel) {
            errorHandler(intl);
            return {error: 'could not fetch channel member'};
        }

        const modelPromises: Array<Promise<Model[]>> = [];
        const {operator} = DatabaseManager.serverDatabases[serverUrl];
        if (!(team instanceof Model)) {
            const prepT = prepareMyTeams(operator, [team], [(myTeam as TeamMembership)]);
            if (prepT) {
                modelPromises.push(...prepT);
            }
        } else if (!(myTeam instanceof Model)) {
            const mt: MyTeam[] = [{
                id: myTeam.team_id,
                roles: myTeam.roles,
            }];
            modelPromises.push(
                operator.handleMyTeam({myTeams: mt, prepareRecordsOnly: true}),
                operator.handleTeamMemberships({teamMemberships: [myTeam], prepareRecordsOnly: true}),
            );
        }

        if (!(myChannel instanceof Model)) {
            const prepCh = await prepareMyChannelsForTeam(operator, team.id, [channel], [myChannel]);
            if (prepCh) {
                modelPromises.push(...prepCh);
            }
        }

        let teamId;
        if (team.id !== system.currentTeamId) {
            teamId = team.id;
        }

        let channelId;
        if (channel.id !== system.currentChannelId) {
            channelId = channel.id;
        }

        if (modelPromises.length) {
            const models = await Promise.all(modelPromises);
            await operator.batchRecords(models.flat());
        }

        if (channelId) {
            fetchPostsForChannel(serverUrl, channelId);
        }

        if (teamId) {
            fetchMyChannelsForTeam(serverUrl, teamId, true, 0, false, true);
        }

        await setCurrentTeamAndChannelId(operator, teamId, channelId);
        if (teamId && channelId) {
            await addChannelToTeamHistory(operator, teamId, channelId, false);
        }

        if (roles.length) {
            fetchRolesIfNeeded(serverUrl, roles);
        }

        return {error: undefined};
    } catch (error) {
        errorHandler(intl);
        return {error};
    }
};
