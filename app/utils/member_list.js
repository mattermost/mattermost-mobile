// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

export const loadingText = {
    id: 'mobile.loading_members',
    defaultMessage: 'Loading Members...',
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

export function markSelectedProfiles(profiles, selectedProfiles) {
    return profiles.map((p) => {
        const profile = {...p};
        profile.selected = selectedProfiles[p.id];
        return profile;
    });
}
