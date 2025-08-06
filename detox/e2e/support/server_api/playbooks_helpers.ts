// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getRandomId} from '@support/utils';

/**
 * Generate a random checklist for a playbook
 * @param {number} numChecklists - number of checklists to generate
 * @param {number} numItems - number of items per checklist
 * @return {Array} returns array of checklist objects
 */
export const generateRandomChecklists = (numChecklists = 1, numItems = 3) => {
    const checklists = [];

    for (let i = 0; i < numChecklists; i++) {
        const randomId = getRandomId(6);
        const items = [];

        for (let j = 0; j < numItems; j++) {
            items.push({
                title: `Task ${j + 1} for checklist ${i + 1} (${randomId})`,
                description: `Description for task ${j + 1}`,
            });
        }

        checklists.push({
            title: `Checklist ${i + 1} (${randomId})`,
            items,
        });
    }

    return checklists;
};

/**
 * Generate a random playbook
 * @param {Object} options - playbook options
 * @return {Object} returns a playbook object
 */
interface PlaybookOptions {
    teamId: string;
    userId: string;
    prefix?: string;
    numChecklists?: number;
    numItems?: number;
    isPublic?: boolean;
    broadcastEnabled?: boolean;
    broadcastChannelIds?: string[];
    statusUpdateEnabled?: boolean;
    retrospectiveEnabled?: boolean;
    metricsEnabled?: boolean;
    reminderTimerDefaultSeconds?: number;
    channel_id?: string;
}

export const generateRandomPlaybook = ({
    teamId,
    userId,
    prefix = 'playbook',
    numChecklists = 1,
    numItems = 3,
    isPublic = true,
    broadcastEnabled = false,
    broadcastChannelIds = [],
    statusUpdateEnabled = true,
    retrospectiveEnabled = true,
    metricsEnabled = false,
    channel_id = '',
}: PlaybookOptions) => {
    const randomId = getRandomId(6);
    const title = `${prefix}-${randomId}`;

    return {
        channel_id,
        team_id: teamId,
        title,
        description: `Description for ${title}`,
        checklists: generateRandomChecklists(numChecklists, numItems),
        members: [
            {user_id: userId, roles: ['playbook_member', 'playbook_admin']},
        ],
        public: isPublic,
        broadcast_enabled: broadcastEnabled,
        broadcast_channel_ids: broadcastChannelIds,
        status_update_enabled: statusUpdateEnabled,
        retrospective_enabled: retrospectiveEnabled,
        reminder_timer_default_seconds: 3600, // 1 hour in seconds
        metrics: metricsEnabled ? [
            {
                title: 'Time to resolution',
                description: 'Time from playbook run start to finish',
                type: 'duration',
                target: 60 * 60 * 24, // 1 day in seconds
            },
            {
                title: 'Customer impact',
                description: 'Number of customers affected',
                type: 'integer',
                target: 0,
            },
        ] : [],
    };
};

/**
 * Generate a random playbook run
 * @param {Object} options - playbook run options, must include teamId, playbookId, channelId, and ownerId
 * @return {Object} returns a playbook run object
 */
interface PlaybookRunOptions {
    teamId: string;
    playbookId: string;
    channelId: string;
    ownerId: string;
    prefix?: string;
}

export const generateRandomPlaybookRun = ({
    teamId,
    playbookId,
    channelId,
    ownerId,
    prefix = 'run',
}: PlaybookRunOptions) => {
    const randomId = getRandomId(6);
    const name = `${prefix}-${randomId}`;

    return {
        name,
        owner_user_id: ownerId,
        team_id: teamId,
        playbook_id: playbookId,
        channel_id: channelId,
        description: `Description for ${name}`,
    };
};

export const PlaybooksHelpers = {
    generateRandomChecklists,
    generateRandomPlaybook,
    generateRandomPlaybookRun,
};

export default PlaybooksHelpers;
