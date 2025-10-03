// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {buildQueryString} from '@utils/helpers';

import type ClientBase from '@client/rest/base';

export interface ClientPlaybooksMix {

    // Playbook Runs
    fetchPlaybookRuns: (params: FetchPlaybookRunsParams, groupLabel?: RequestGroupLabel) => Promise<FetchPlaybookRunsReturn>;
    fetchPlaybookRun: (id: string, groupLabel?: RequestGroupLabel) => Promise<PlaybookRun>;
    setOwner: (playbookRunId: string, ownerId: string) => Promise<void>;

    // Run Management
    finishRun: (playbookRunId: string) => Promise<void>;

    // Checklist Management
    setChecklistItemState: (playbookRunID: string, checklistNum: number, itemNum: number, newState: ChecklistItemState) => Promise<void>;
    skipChecklistItem: (playbookRunID: string, checklistNum: number, itemNum: number) => Promise<void>;
    restoreChecklistItem: (playbookRunID: string, checklistNum: number, itemNum: number) => Promise<void>;
    setAssignee: (playbookRunId: string, checklistNum: number, itemNum: number, assigneeId?: string) => Promise<void>;
    setDueDate: (playbookRunId: string, checklistNum: number, itemNum: number, date?: number) => Promise<void>;

    // skipChecklist: (playbookRunID: string, checklistNum: number) => Promise<void>;

    // Slash Commands
    runChecklistItemSlashCommand: (playbookRunId: string, checklistNumber: number, itemNumber: number) => Promise<{trigger_id: string}>;
    setChecklistItemCommand: (playbookRunID: string, checklistNum: number, itemNum: number, command: string) => Promise<void>;
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

    fetchPlaybookRun = async (id: string, groupLabel?: RequestGroupLabel) => {
        return this.doFetch(
            `${this.getPlaybookRunRoute(id)}`,
            {method: 'get', groupLabel},
        );
    };

    setOwner = async (playbookRunId: string, ownerId: string) => {
        const data = await this.doFetch(
            `${this.getPlaybookRunRoute(playbookRunId)}/owner`,
            {method: 'post', body: {owner_id: ownerId}},
        );
        return data;
    };

    // Run Management
    finishRun = async (playbookRunId: string) => {
        return this.doFetch(
            `${this.getPlaybookRunRoute(playbookRunId)}/finish`,
            {method: 'put', body: {/* okhttp requires put methods to have a body */}},
        );
    };

    // Checklist Management
    setChecklistItemState = async (playbookRunID: string, checklistNum: number, itemNum: number, newState: ChecklistItemState) => {
        await this.doFetch(
            `${this.getPlaybookRunRoute(playbookRunID)}/checklists/${checklistNum}/item/${itemNum}/state`,
            {method: 'put', body: {new_state: newState}},
        );
    };

    skipChecklistItem = async (playbookRunID: string, checklistNum: number, itemNum: number) => {
        await this.doFetch(
            `${this.getPlaybookRunRoute(playbookRunID)}/checklists/${checklistNum}/item/${itemNum}/skip`,
            {method: 'put', body: ''},
        );
    };

    restoreChecklistItem = async (playbookRunID: string, checklistNum: number, itemNum: number) => {
        await this.doFetch(
            `${this.getPlaybookRunRoute(playbookRunID)}/checklists/${checklistNum}/item/${itemNum}/restore`,
            {method: 'put', body: ''},
        );
    };

    // skipChecklist = async (playbookRunID: string, checklistNum: number) => {
    //     await this.doFetch(
    //         `${this.getPlaybookRunRoute(playbookRunID)}/checklists/${checklistNum}/skip`,
    //         {method: 'put', body: ''},
    //     );
    // };

    setAssignee = async (playbookRunId: string, checklistNum: number, itemNum: number, assigneeId?: string) => {
        await this.doFetch(
            `${this.getPlaybookRunRoute(playbookRunId)}/checklists/${checklistNum}/item/${itemNum}/assignee`,
            {method: 'put', body: {assignee_id: assigneeId}},
        );
    };

    setDueDate = async (playbookRunId: string, checklistNum: number, itemNum: number, date?: number) => {
        await this.doFetch(
            `${this.getPlaybookRunRoute(playbookRunId)}/checklists/${checklistNum}/item/${itemNum}/duedate`,
            {method: 'put', body: {due_date: date}},
        );
    };

    // Slash Commands
    runChecklistItemSlashCommand = async (playbookRunId: string, checklistNumber: number, itemNumber: number) => {
        const data = await this.doFetch(
            `${this.getPlaybookRunRoute(playbookRunId)}/checklists/${checklistNumber}/item/${itemNumber}/run`,
            {method: 'post'},
        );

        return data;
    };

    setChecklistItemCommand = async (playbookRunID: string, checklistNum: number, itemNum: number, command: string) => {
        const data = await this.doFetch(
            `${this.getPlaybookRunRoute(playbookRunID)}/checklists/${checklistNum}/item/${itemNum}/command`,
            {method: 'put', body: {command}},
        );

        return data;
    };
};

export default ClientPlaybooks;
