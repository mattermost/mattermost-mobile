// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {buildQueryString} from '@utils/helpers';

import type ClientBase from '@client/rest/base';

export interface ClientPlaybooksMix {

    // Playbook Runs
    fetchPlaybookRuns: (params: FetchPlaybookRunsParams, groupLabel?: RequestGroupLabel) => Promise<FetchPlaybookRunsReturn>;

    // fetchPlaybookRun: (id: string, groupLabel?: RequestGroupLabel) => Promise<PlaybookRun>;

    // Run Management
    // finishRun: (playbookRunId: string) => Promise<any>;

    // Checklist Management
    setChecklistItemState: (playbookRunID: string, checklistNum: number, itemNum: number, newState: ChecklistItemState) => Promise<any>;

    // skipChecklistItem: (playbookRunID: string, checklistNum: number, itemNum: number) => Promise<void>;
    // skipChecklist: (playbookRunID: string, checklistNum: number) => Promise<void>;

    // Slash Commands
    runChecklistItemSlashCommand: (playbookRunId: string, checklistNumber: number, itemNumber: number) => Promise<void>;
}

const ClientPlaybooks = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    // Route generators
    getPlaybooksRoute = () => {
        return '/plugins/playbooks/api/v0';
    };

    getPlaybookRunsRoute = () => {
        return `${this.getPlaybooksRoute()}/runs`;
    };

    getPlaybookRunRoute = (runId: string) => {
        return `${this.getPlaybookRunsRoute()}/${runId}`;
    };

    // Playbook Runs
    fetchPlaybookRuns = async (params: FetchPlaybookRunsParams, groupLabel?: RequestGroupLabel) => {
        const queryParams = buildQueryString(params);

        try {
            const data = await this.doFetch(
                `${this.getPlaybookRunsRoute()}${queryParams}`,
                {method: 'get', groupLabel},
            );
            return data || {items: [], total_count: 0, page_count: 0, has_more: false};
        } catch (error) {
            return {items: [], total_count: 0, page_count: 0, has_more: false};
        }
    };

    // fetchPlaybookRun = async (id: string, groupLabel?: RequestGroupLabel) => {
    //     return this.doFetch(
    //         `${this.getPlaybookRunRoute(id)}`,
    //         {method: 'get', groupLabel},
    //     );
    // };

    // Run Management
    // finishRun = async (playbookRunId: string) => {
    //     try {
    //         return await this.doFetch(
    //             `${this.getPlaybookRunRoute(playbookRunId)}/finish`,
    //             {method: 'put'},
    //         );
    //     } catch (error) {
    //         return {error};
    //     }
    // };

    // Checklist Management
    setChecklistItemState = async (playbookRunID: string, checklistNum: number, itemNum: number, newState: ChecklistItemState) => {
        try {
            return await this.doFetch(
                `${this.getPlaybookRunRoute(playbookRunID)}/checklists/${checklistNum}/item/${itemNum}/state`,
                {method: 'put', body: {new_state: newState}},
            );
        } catch (error) {
            return {error};
        }
    };

    // skipChecklistItem = async (playbookRunID: string, checklistNum: number, itemNum: number) => {
    //     await this.doFetch(
    //         `${this.getPlaybookRunRoute(playbookRunID)}/checklists/${checklistNum}/item/${itemNum}/skip`,
    //         {method: 'put', body: ''},
    //     );
    // };

    // skipChecklist = async (playbookRunID: string, checklistNum: number) => {
    //     await this.doFetch(
    //         `${this.getPlaybookRunRoute(playbookRunID)}/checklists/${checklistNum}/skip`,
    //         {method: 'put', body: ''},
    //     );
    // };

    // Slash Commands
    runChecklistItemSlashCommand = async (playbookRunId: string, checklistNumber: number, itemNumber: number) => {
        await this.doFetch(
            `${this.getPlaybookRunRoute(playbookRunId)}/checklists/${checklistNumber}/item/${itemNumber}/run`,
            {method: 'post'},
        );
    };
};

export default ClientPlaybooks;
