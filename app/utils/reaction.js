// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function generateUserProfilesById(userProfiles = []) {
    return userProfiles.reduce((acc, userProfile) => {
        acc[userProfile.id] = userProfile;

        return acc;
    }, []);
}

export function getMissingUserIds(userProfilesById = {}, allUserIds = []) {
    return allUserIds.reduce((acc, userId) => {
        if (!userProfilesById[userId]) {
            acc.push(userId);
        }

        return acc;
    }, []);
}

export function getReactionsByName(reactions = {}) {
    return Object.values(reactions).reduce((acc, reaction) => {
        const byName = acc[reaction.emoji_name] || [];
        acc[reaction.emoji_name] = [...byName, reaction];

        return acc;
    }, {});
}

export function getSortedReactionsForHeader(reactionsByName = {}) {
    const sortedReactionsForHeader = Object.entries(reactionsByName).map(([name, reactions]) => ({name, reactions, count: reactions.length}));

    return [...sortedReactionsForHeader];
}

export function getUniqueUserIds(reactions = {}) {
    return Object.values(reactions).map((reaction) => reaction.user_id).filter((id, index, arr) => arr.indexOf(id) === index);
}
