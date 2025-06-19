// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import Checklist from './checklist';

import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';

type Props = {
    checklists: Array<PlaybookChecklistModel | PlaybookChecklist>;
    channelId: string;
    playbookRunId: string;
    isFinished: boolean;
}

const ChecklistList = ({
    checklists,
    channelId,
    playbookRunId,
    isFinished,
}: Props) => {
    return (
        <View>
            {checklists.map((checklist, index) => (
                <Checklist
                    key={checklist.id}
                    checklist={checklist}
                    channelId={channelId}
                    playbookRunId={playbookRunId}
                    checklistNumber={index}
                    isFinished={isFinished}
                />
            ))}
        </View>
    );
};

export default ChecklistList;
