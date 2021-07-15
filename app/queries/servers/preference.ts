// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ServerDataOperator from '@database/operator/server_data_operator';

export const prepareMyPreferences = (operator: ServerDataOperator, preferences: PreferenceType[]) => {
    try {
        return operator.handlePreferences({
            prepareRecordsOnly: true,
            preferences,
        });
    } catch {
        return undefined;
    }
};
