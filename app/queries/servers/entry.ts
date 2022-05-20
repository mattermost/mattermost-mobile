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
    isCRTEnabled?: boolean;
}

export async function prepareModels({operator, initialTeamId, removeTeams, removeChannels, teamData, chData, prefData, meData, isCRTEnabled}: PrepareModelsArgs): Promise<Array<Promise<Model[]>>> {
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

    if (teamData?.teams?.length && teamData.memberships?.length) {
        modelPromises.push(...prepareMyTeams(operator, teamData.teams, teamData.memberships));
    }

    if (chData?.categories?.length) {
        modelPromises.push(prepareCategories(operator, chData.categories));
        modelPromises.push(prepareCategoryChannels(operator, chData.categories));
    }

    if (initialTeamId && chData?.channels?.length && chData.memberships?.length) {
        modelPromises.push(...await prepareMyChannelsForTeam(operator, initialTeamId, chData.channels, chData.memberships, isCRTEnabled));
    }

    if (prefData?.preferences?.length) {
        modelPromises.push(prepareMyPreferences(operator, prefData.preferences, true));
    }

    if (meData?.user) {
        modelPromises.push(prepareUsers(operator, [meData.user]));
    }

    return modelPromises;
}
