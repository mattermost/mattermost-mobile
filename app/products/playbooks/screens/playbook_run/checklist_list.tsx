// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import Checklist from './checklist';

import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';

type Props = {
    checklists: PlaybookChecklistModel[];
}

const ChecklistList = ({
    checklists,
}: Props) => {
    return (
        <View>
            {checklists.map((checklist) => (
                <Checklist
                    key={checklist.id}
                    checklist={checklist}
                />
            ))}
        </View>
    );
};

export default ChecklistList;
