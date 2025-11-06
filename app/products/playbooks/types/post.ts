// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type PostStatusUpdateProps = {
    authorUsername: string;
    numTasks: number;
    numTasksChecked: number;
    participantIds: string[];
    playbookRunId: string;
    runName: string;
};
