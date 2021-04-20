// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {buildQueryString} from '@mm-redux/utils/helpers';

import {PER_PAGE_DEFAULT} from './constants';

export interface ClientSharedChannelsMix {
    getRemoteClusterInfo: (remote_id: string) => Promise<any>;
    getSharedChannels: (teamId: string, page: number, perPage?: number) => Promise<any>;
}

const ClientSharedChannels = (superclass: any) => class extends superclass {
    getRemoteClusterInfo = async (remote_id: string) => {
        const response = await this.doFetch(
            `${this.getSharedChannelsRoute()}/remote_info/${remote_id}`,
            {method: 'get'},
        );
        return {
            ...response,
            remote_id,
        };
    };

    getSharedChannels = async (teamId: string, page = 0, perPage = PER_PAGE_DEFAULT) => {
        return this.doFetch(
            `${this.getSharedChannelsRoute()}/${teamId}${buildQueryString({page, per_page: perPage})}`,
            {method: 'get'},
        );
    };
};

export default ClientSharedChannels;
