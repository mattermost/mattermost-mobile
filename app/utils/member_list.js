// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import MemberListRow from 'app/components/custom_list/member_list_row';
import {displayUsername} from 'mattermost-redux/utils/user_utils';

export const loadingText = {
    id: 'mobile.loading_members',
    defaultMessage: 'Loading Members...'
};

export function createMembersSections(data) {
    const sections = {};
    data.forEach((d) => {
        const name = d.username;
        const sectionKey = name.substring(0, 1).toUpperCase();

        if (!sections[sectionKey]) {
            sections[sectionKey] = [];
        }

        sections[sectionKey].push(d);
    });

    return sections;
}

export function renderMemberRow(user, sectionId, rowId, preferences, theme, selectable, onPress, onSelect) {
    const {id, username} = user;
    const displayName = displayUsername(user, preferences);
    let onRowSelect = null;
    if (selectable) {
        onRowSelect = () => onSelect(sectionId, rowId);
    }

    return (
        <MemberListRow
            id={id}
            user={user}
            displayName={displayName}
            username={username}
            theme={theme}
            onPress={onPress}
            selectable={selectable}
            selected={user.selected}
            onRowSelect={onRowSelect}
        />
    );
}

export function markSelectedProfiles(profiles, selectedProfiles) {
    return profiles.map((p) => {
        const profile = {...p};
        profile.selected = selectedProfiles[p.id];
        return profile;
    });
}
