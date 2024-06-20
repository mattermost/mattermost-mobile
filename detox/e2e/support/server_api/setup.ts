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
    const {team} = await Team.apiCreateTeam(baseUrl, teamOptions);
    const {channel} = await Channel.apiCreateChannel(baseUrl, {...channelOptions, teamId: team.id});
    const {user} = await User.apiCreateUser(baseUrl, userOptions);

    await Team.apiAddUserToTeam(baseUrl, user.id, team.id);
    await Channel.apiAddUserToChannel(baseUrl, user.id, channel.id);

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
