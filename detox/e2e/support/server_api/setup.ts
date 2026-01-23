// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Channel from './channel';
import Team from './team';
import User from './user';

/**
 * Creates new user, channel and team for test isolation.
 * @param {string} baseUrl - the base server URL
 * @param {Object} options - may pass options to predefine channel, team and user creation
 * @return {Object} returns {channel, team, user} on success or {error, status} on error
 */
export const apiInit = async (baseUrl: string, {
    channelOptions = {type: 'O', prefix: 'channel'},
    teamOptions = {type: 'O', prefix: 'team'},
    userOptions = {prefix: 'user'},
}: any = {}): Promise<any> => {
    const teamResult = await Team.apiCreateTeam(baseUrl, teamOptions);
    if (teamResult.error) {
        throw new Error(`Failed to create team: ${JSON.stringify(teamResult.error)}`);
    }
    const {team} = teamResult;

    const channelResult = await Channel.apiCreateChannel(baseUrl, {...channelOptions, teamId: team.id});
    if (channelResult.error) {
        throw new Error(`Failed to create channel: ${JSON.stringify(channelResult.error)}`);
    }
    const {channel} = channelResult;

    const userResult = await User.apiCreateUser(baseUrl, userOptions);
    if (userResult.error) {
        throw new Error(`Failed to create user: ${JSON.stringify(userResult.error)}`);
    }
    const {user} = userResult;

    const addTeamResult = await Team.apiAddUserToTeam(baseUrl, user.id, team.id);
    if (addTeamResult.error) {
        throw new Error(`Failed to add user to team: ${JSON.stringify(addTeamResult.error)}`);
    }

    const addChannelResult = await Channel.apiAddUserToChannel(baseUrl, user.id, channel.id);
    if (addChannelResult.error) {
        throw new Error(`Failed to add user to channel: ${JSON.stringify(addChannelResult.error)}`);
    }

    return {
        channel,
        team,
        user,
    };
};

export const Setup = {
    apiInit,
};

export default Setup;
