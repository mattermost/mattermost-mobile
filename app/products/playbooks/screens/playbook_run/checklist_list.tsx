// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {StyleSheet, View} from 'react-native';

import Checklist from './checklist';

import type {TaskActivity} from './checklist/checklist_item/task_activity';
import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';
import type {TaskFilters} from '@playbooks/utils/task_filters';

type Props = {
    checklists: Array<PlaybookChecklistModel | PlaybookChecklist>;
    apiActivityByItemId?: Record<string, TaskActivity | undefined>;
    channelId: string;
    playbookRunId: string;
    playbookRunName: string;
    isFinished: boolean;
    isParticipant: boolean;
    filters: TaskFilters;
    currentUserId: string;
    expandedById: Record<string, boolean>;
    onToggleChecklistExpanded: (checklistId: string) => void;
    onClearFilters: () => void;
}

const styles = StyleSheet.create({
    container: {
        opacity: 0.72,
    },
});

const ChecklistList = ({
    checklists,
    apiActivityByItemId,
    channelId,
    playbookRunId,
    playbookRunName,
    isFinished,
    isParticipant,
    filters,
    currentUserId,
    expandedById,
    onToggleChecklistExpanded,
    onClearFilters,
}: Props) => {
    return (
        <View style={(isFinished || !isParticipant) ? styles.container : undefined}>
            {checklists.map((checklist, index) => (
                <ChecklistRow
                    key={checklist.id}
                    checklist={checklist}
                    apiActivityByItemId={apiActivityByItemId}
                    channelId={channelId}
                    playbookRunId={playbookRunId}
                    playbookRunName={playbookRunName}
                    checklistNumber={index}
                    isFinished={isFinished}
                    isParticipant={isParticipant}
                    filters={filters}
                    currentUserId={currentUserId}
                    expanded={expandedById[checklist.id] ?? true}
                    onToggleChecklistExpanded={onToggleChecklistExpanded}
                    onClearFilters={onClearFilters}
                />
            ))}
        </View>
    );
};

type ChecklistRowProps = Omit<Props, 'checklists' | 'expandedById'> & {
    checklist: PlaybookChecklistModel | PlaybookChecklist;
    checklistNumber: number;
    expanded: boolean;
};

// Local row so each checklist can take a stable onToggleExpanded without an inline arrow in the map.
function ChecklistRow({
    checklist,
    apiActivityByItemId,
    channelId,
    playbookRunId,
    playbookRunName,
    checklistNumber,
    isFinished,
    isParticipant,
    filters,
    currentUserId,
    expanded,
    onToggleChecklistExpanded,
    onClearFilters,
}: ChecklistRowProps) {
    const onToggleExpanded = useCallback(() => {
        onToggleChecklistExpanded(checklist.id);
    }, [checklist.id, onToggleChecklistExpanded]);

    return (
        <Checklist
            checklist={checklist}
            apiActivityByItemId={apiActivityByItemId}
            channelId={channelId}
            playbookRunId={playbookRunId}
            playbookRunName={playbookRunName}
            checklistNumber={checklistNumber}
            isFinished={isFinished}
            isParticipant={isParticipant}
            filters={filters}
            currentUserId={currentUserId}
            expanded={expanded}
            onToggleExpanded={onToggleExpanded}
            onClearFilters={onClearFilters}
        />
    );
}

export default ChecklistList;
