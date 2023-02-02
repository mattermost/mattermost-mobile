// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {buildQueryString} from '@utils/helpers';

import {PER_PAGE_DEFAULT} from './constants';

import type ClientBase from './base';

export interface ClientGroupsMix {
    getGroup: (id: string) => Promise<Group>;
    getGroups: (params: {query?: string; filterAllowReference?: boolean; page?: number; perPage?: number; since?: number; includeMemberCount?: boolean}) => Promise<Group[]>;
    getAllGroupsAssociatedToChannel: (channelId: string, filterAllowReference?: boolean) => Promise<{groups: Group[]; total_group_count: number}>;
    getAllGroupsAssociatedToMembership: (userId: string, filterAllowReference?: boolean) => Promise<Group[]>;
    getAllGroupsAssociatedToTeam: (teamId: string, filterAllowReference?: boolean) => Promise<{groups: Group[]; total_group_count: number}>;
    getAllChannelsAssociatedToGroup: (groupId: string, filterAllowReference?: boolean) => Promise<{groupChannels: GroupChannel[]}>;
    getAllMembershipsAssociatedToGroup: (groupId: string, filterAllowReference?: boolean) => Promise<{groupMemberships: UserProfile[]; total_member_count: number}>;
    getAllTeamsAssociatedToGroup: (groupId: string, filterAllowReference?: boolean) => Promise<{groupTeams: GroupTeam[]}>;
}

const ClientGroups = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    getGroup = async (id: string) => {
        return this.doFetch(
            `${this.urlVersion}/groups/${id}`,
            {method: 'get'},
        );
    };

    getGroups = async ({query = '', filterAllowReference = true, page = 0, perPage = PER_PAGE_DEFAULT, since = 0, includeMemberCount = false}) => {
        return this.doFetch(
            `${this.urlVersion}/groups${buildQueryString({
                q: query,
                filter_allow_reference: filterAllowReference,
                page,
                per_page: perPage,
                since,
                include_member_count: includeMemberCount,
            })}`,
            {method: 'get'},
        );
    };

    getAllGroupsAssociatedToChannel = async (channelId: string, filterAllowReference = false) => {
        return this.doFetch(
            `${this.urlVersion}/channels/${channelId}/groups${buildQueryString({
                paginate: false,
                filter_allow_reference: filterAllowReference,
                include_member_count: true,
            })}`,
            {method: 'get'},
        );
    };

    getAllGroupsAssociatedToTeam = async (teamId: string, filterAllowReference = false) => {
        return this.doFetch(
            `${this.urlVersion}/teams/${teamId}/groups${buildQueryString({paginate: false, filter_allow_reference: filterAllowReference})}`,
            {method: 'get'},
        );
    };

    getAllGroupsAssociatedToMembership = async (userId: string, filterAllowReference = false) => {
        return this.doFetch(
            `${this.urlVersion}/users/${userId}/groups${buildQueryString({paginate: false, filter_allow_reference: filterAllowReference})}`,
            {method: 'get'},
        );
    };

    getAllTeamsAssociatedToGroup = async (groupId: string, filterAllowReference = false) => {
        return this.doFetch(
            `${this.urlVersion}/groups/${groupId}/teams${buildQueryString({filter_allow_reference: filterAllowReference})}`,
            {method: 'get'},
        );
    };

    getAllChannelsAssociatedToGroup = async (groupId: string, filterAllowReference = false) => {
        return this.doFetch(
            `${this.urlVersion}/groups/${groupId}/channels${buildQueryString({filter_allow_reference: filterAllowReference})}`,
            {method: 'get'},
        );
    };

    getAllMembershipsAssociatedToGroup = async (groupId: string, filterAllowReference = false) => {
        return this.doFetch(
            `${this.urlVersion}/groups/${groupId}/members${buildQueryString({filter_allow_reference: filterAllowReference})}`,
            {method: 'get'},
        );
    };
};

export default ClientGroups;
