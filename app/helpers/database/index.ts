// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type Model from '@nozbe/watermelondb/Model';

export const extractRecordsForTable = <T>(records: Model[], tableName: string): T[] => {
    // @ts-expect-error constructor.table not exposed in type definition
    return records.filter((r) => r.constructor.table === tableName) as T[];
};
