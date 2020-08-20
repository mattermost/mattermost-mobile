// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Channel from './channel';
import Team from './team';
import User from './user';
import {getResponseFromError} from './common';

/**
 * Creates new user, channel and team for test isolation.
 * @param {Object} options - may pass options to predefine channel, team and user creation
 * @param {Object} option.teamOptions
 * @param {Object} option.userOptions
 * @return {Object} returns {channel, team, user} on success or {error, status} on error
 */
export const apiInit = async ({
    channelOptions = {type: 'O', prefix: 'channel'},
    teamOptions = {type: 'O', prefix: 'team'},
    userOptions = {prefix: 'user'},
} = {}) => {
    try {
        const {team} = await Team.apiCreateTeam(teamOptions);
        const {channel} = await Channel.apiCreateChannel({...channelOptions, teamId: team.id});
        const {user} = await User.apiCreateUser(userOptions);

        await Team.apiAddUserToTeam(user.id, team.id);
        await Channel.apiAddUserToChannel(user.id, channel.id);

        return {
            channel,
            team,
            user,
        };
    } catch (err) {
        return getResponseFromError(err);
    }
};

export const Setup = {
    apiInit,
};

export default Setup;
