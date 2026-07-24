// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ClientBase from './base';

export interface ClientDraftsMix {
    getDrafts(teamId: string, groupLabel?: RequestGroupLabel): Promise<DraftApi[]>;
    upsertDraft(draft: DraftUpsertRequest, connectionId?: string): Promise<DraftApi>;
    deleteDraft(channelId: string, rootId?: string, connectionId?: string): Promise<DraftApi>;
}

const ClientDrafts = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    getDrafts = (teamId: string, groupLabel?: RequestGroupLabel) => {
        return this.doFetch(
            this.getUserTeamDraftsRoute('me', teamId),
            {method: 'get', groupLabel},
        );
    };

    upsertDraft = (draft: DraftUpsertRequest, connectionId?: string) => {
        const headers: Record<string, string> = {};
        if (connectionId) {
            headers['Connection-Id'] = connectionId;
        }
        return this.doFetch(
            this.getDraftsRoute(),
            {
                method: 'post',
                body: draft,
                headers,
            },
        );
    };

    deleteDraft = (channelId: string, rootId = '', connectionId?: string) => {
        const headers: Record<string, string> = {};
        if (connectionId) {
            headers['Connection-Id'] = connectionId;
        }
        const route = rootId ? this.getUserThreadDraftRoute('me', channelId, rootId) : this.getUserChannelDraftsRoute('me', channelId);
        return this.doFetch(
            route,
            {
                method: 'delete',
                headers,
            },
        );
    };
};

export default ClientDrafts;
