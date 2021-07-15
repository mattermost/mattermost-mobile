// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

interface PreferenceType {
    category: string;
    name: string;
    user_id: string;
    value: string;
}

interface PreferencesType {
    [x: string]: PreferenceType;
}
