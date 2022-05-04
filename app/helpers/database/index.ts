// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General} from '@constants';

import type Model from '@nozbe/watermelondb/Model';
import type ChannelModel from '@typings/database/models/servers/channel';

export const extractRecordsForTable = <T>(records: Model[], tableName: string): T[] => {
    // @ts-expect-error constructor.table not exposed in type definition
    return records.filter((r) => r.constructor.table === tableName) as T[];
};

export function extractChannelDisplayName(raw: Pick<Channel, 'type' | 'display_name' | 'fake'>, record?: ChannelModel) {
    let displayName = '';
    switch (raw.type) {
        case General.DM_CHANNEL:
            displayName = raw.display_name.trim() || record?.displayName || '';
            break;
        case General.GM_CHANNEL: {
            if (raw.fake) {
                displayName = raw.display_name;
            } else {
                displayName = record?.displayName || raw.display_name;
            }
            break;
        }
        default:
            displayName = raw.display_name;
            break;
    }

    return displayName;
}
