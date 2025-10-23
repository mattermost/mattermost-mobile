// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';

import Checklist from './checklist';

import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';

type Props = {
    checklists: Array<PlaybookChecklistModel | PlaybookChecklist>;
    channelId: string;
    playbookRunId: string;
    playbookRunName: string;
    isFinished: boolean;
    isParticipant: boolean;
}

const styles = StyleSheet.create({
    container: {
        opacity: 0.72,
    },
});

const ChecklistList = ({
    checklists,
    channelId,
    playbookRunId,
    playbookRunName,
    isFinished,
    isParticipant,
}: Props) => {
    return (
        <View style={(isFinished || !isParticipant) ? styles.container : undefined}>
            {checklists.map((checklist, index) => (
                <Checklist
                    key={checklist.id}
                    checklist={checklist}
                    channelId={channelId}
                    playbookRunId={playbookRunId}
                    playbookRunName={playbookRunName}
                    checklistNumber={index}
                    isFinished={isFinished}
                    isParticipant={isParticipant}
                />
            ))}
        </View>
    );
};

export default ChecklistList;
