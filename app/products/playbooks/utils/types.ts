// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {PostStatusUpdateProps} from '@playbooks/types/post';

export function isPostStatusUpdateProps(props: unknown): props is PostStatusUpdateProps {
    if (typeof props !== 'object' || props === null) {
        return false;
    }

    if (!('authorUsername' in props) || typeof props.authorUsername !== 'string') {
        return false;
    }

    if (!('numTasks' in props) || typeof props.numTasks !== 'number') {
        return false;
    }

    if (!('numTasksChecked' in props) || typeof props.numTasksChecked !== 'number') {
        return false;
    }

    if (!('participantIds' in props) || !Array.isArray(props.participantIds)) {
        return false;
    }

    if (!props.participantIds.every((id) => typeof id === 'string')) {
        return false;
    }

    if (!('playbookRunId' in props) || typeof props.playbookRunId !== 'string') {
        return false;
    }

    if (!('runName' in props) || typeof props.runName !== 'string') {
        return false;
    }

    return true;
}
