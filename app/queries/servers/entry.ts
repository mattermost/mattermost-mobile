// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import ServerDataOperator from '@database/operator/server_data_operator';

import {prepareCategories, prepareCategoryChannels} from './categories';
import {prepareDeleteChannel, prepareMyChannelsForTeam} from './channel';
import {prepareMyPreferences} from './preference';
import {prepareDeleteTeam, prepareMyTeams} from './team';
import {prepareUsers} from './user';

import type {MyChannelsRequest} from '@actions/remote/channel';
import type {MyPreferencesRequest} from '@actions/remote/preference';
import type {MyTeamsRequest} from '@actions/remote/team';
import type {MyUserRequest} from '@actions/remote/user';
import type {Model} from '@nozbe/watermelondb';
import type ChannelModel from '@typings/database/models/servers/channel';
import type TeamModel from '@typings/database/models/servers/team';

type PrepareModelsArgs = {
    operator: ServerDataOperator;
    initialTeamId?: string;
    removeTeams?: TeamModel[];
    removeChannels?: ChannelModel[];
    teamData?: MyTeamsRequest;
    chData?: MyChannelsRequest;
    prefData?: MyPreferencesRequest;
    meData?: MyUserRequest;
}

export const prepareModels = async ({operator, initialTeamId, removeTeams, removeChannels, teamData, chData, prefData, meData}: PrepareModelsArgs): Promise<Array<Promise<Model[]>>> => {
    const modelPromises: Array<Promise<Model[]>> = [];

    if (removeTeams?.length) {
        removeTeams.forEach((team) => {
            modelPromises.push(prepareDeleteTeam(team));
        });
    }

    if (removeChannels?.length) {
        removeChannels.forEach((channel) => {
            modelPromises.push(prepareDeleteChannel(channel));
        });
    }

    if (teamData?.teams?.length) {
        const teamModels = prepareMyTeams(operator, teamData.teams, teamData.memberships || []);
        if (teamModels) {
            modelPromises.push(...teamModels);
        }
    }

    if (chData?.categories?.length) {
        const categoryModels = prepareCategories(operator, chData.categories);
        if (categoryModels) {
            modelPromises.push(categoryModels);
        }

        const categoryChannelModels = prepareCategoryChannels(operator, chData.categories);
        if (categoryChannelModels) {
            modelPromises.push(categoryChannelModels);
        }
    }

    if (initialTeamId && chData?.channels?.length) {
        const channelModels = await prepareMyChannelsForTeam(operator, initialTeamId, chData.channels, chData.memberships || []);
        if (channelModels) {
            modelPromises.push(...channelModels);
        }
    }

    if (prefData?.preferences?.length) {
        const prefModel = prepareMyPreferences(operator, prefData.preferences, true);
        if (prefModel) {
            modelPromises.push(prefModel);
        }
    }

    if (meData?.user) {
        const userModels = prepareUsers(operator, [meData.user]);
        if (userModels) {
            modelPromises.push(userModels);
        }
    }

    return modelPromises;
};
