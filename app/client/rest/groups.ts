// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {buildQueryString} from '@utils/helpers';

import {PER_PAGE_DEFAULT} from './constants';

export interface ClientGroupsMix {
    getGroups: (query?: string, filterAllowReference?: boolean, page?: number, perPage?: number, since?: number) => Promise<Group[]>;
    getAllGroupsAssociatedToTeam: (teamID: string, filterAllowReference?: boolean) => Promise<{groups: Group[]; total_group_count: number}>;
    getAllGroupsAssociatedToChannel: (channelID: string, filterAllowReference?: boolean) => Promise<{groups: Group[]; total_group_count: number}>;
}

const ClientGroups = (superclass: any) => class extends superclass {
    getGroups = async (query = '', filterAllowReference = true, page = 0, perPage = PER_PAGE_DEFAULT, since = 0) => {
        return this.doFetch(
            `${this.urlVersion}/groups${buildQueryString({q: query, filter_allow_reference: filterAllowReference, page, per_page: perPage, since})}`,
            {method: 'get'},
        );
    };

    getAllGroupsAssociatedToTeam = async (teamID: string, filterAllowReference = false) => {
        return this.doFetch(
            `${this.urlVersion}/teams/${teamID}/groups${buildQueryString({paginate: false, filter_allow_reference: filterAllowReference})}`,
            {method: 'get'},
        );
    };

    getAllGroupsAssociatedToChannel = async (channelID: string, filterAllowReference = false) => {
        return this.doFetch(
            `${this.urlVersion}/channels/${channelID}/groups${buildQueryString({paginate: false, filter_allow_reference: filterAllowReference})}`,
            {method: 'get'},
        );
    };
};

export default ClientGroups;
