// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {createSelector} from 'reselect';

import {General} from 'mattermost-redux/constants';
import {getMyChannels, getOtherChannels} from 'mattermost-redux/selectors/entities/channels';
import {
    getCurrentUser, getCurrentUserId, getProfilesInCurrentChannel,
    getProfilesNotInCurrentChannel, getProfilesInCurrentTeam,
} from 'mattermost-redux/selectors/entities/users';
import {sortChannelsByDisplayName} from 'mattermost-redux/utils/channel_utils';
import {sortByUsername} from 'mattermost-redux/utils/user_utils';

import * as Autocomplete from 'app/constants/autocomplete';
import {getCurrentLocale} from 'app/selectors/i18n';

export const getMatchTermForAtMention = (() => {
    let lastMatchTerm = null;
    let lastValue;
    let lastIsSearch;
    return (value, isSearch) => {
        if (value !== lastValue || isSearch !== lastIsSearch) {
            const regex = isSearch ? Autocomplete.AT_MENTION_SEARCH_REGEX : Autocomplete.AT_MENTION_REGEX;
            const match = value.match(regex);
            lastValue = value;
            lastIsSearch = isSearch;
            if (match) {
                lastMatchTerm = isSearch ? match[1] : match[2];
            } else {
                lastMatchTerm = null;
            }
        }
        return lastMatchTerm;
    };
})();

export const getMatchTermForChannelMention = (() => {
    let lastMatchTerm = null;
    let lastValue;
    let lastIsSearch;
    return (value, isSearch) => {
        if (value !== lastValue || isSearch !== lastIsSearch) {
            const regex = isSearch ? Autocomplete.CHANNEL_MENTION_SEARCH_REGEX : Autocomplete.CHANNEL_MENTION_REGEX;
            const match = value.match(regex);
            lastValue = value;
            lastIsSearch = isSearch;
            if (match) {
                lastMatchTerm = isSearch ? match[1] : match[2];
            } else {
                lastMatchTerm = null;
            }
        }
        return lastMatchTerm;
    };
})();

export const filterMembersInChannel = createSelector(
    getProfilesInCurrentChannel,
    getCurrentUserId,
    (state, matchTerm) => matchTerm,
    (profilesInChannel, currentUserId, matchTerm) => {
        if (matchTerm === null) {
            return null;
        }

        let profiles;
        if (matchTerm) {
            profiles = profilesInChannel.filter((p) => {
                return ((p.id !== currentUserId) && (
                    p.username.toLowerCase().includes(matchTerm) || p.email.toLowerCase().includes(matchTerm) ||
                    p.first_name.toLowerCase().includes(matchTerm) || p.last_name.toLowerCase().includes(matchTerm)));
            });
        } else {
            profiles = profilesInChannel.filter((p) => p.id !== currentUserId);
        }

        // already sorted
        return profiles.map((p) => p.id);
    }
);

export const filterMembersNotInChannel = createSelector(
    getProfilesNotInCurrentChannel,
    getCurrentUserId,
    (state, matchTerm) => matchTerm,
    (profilesNotInChannel, currentUserId, matchTerm) => {
        if (matchTerm === null) {
            return null;
        }

        let profiles;
        if (matchTerm) {
            profiles = profilesNotInChannel.filter((p) => {
                return ((p.id !== currentUserId) && (
                    p.username.toLowerCase().includes(matchTerm) || p.email.toLowerCase().includes(matchTerm) ||
                    p.first_name.toLowerCase().includes(matchTerm) || p.last_name.toLowerCase().includes(matchTerm)));
            });
        } else {
            profiles = profilesNotInChannel;
        }

        return profiles.map((p) => p.id);
    }
);

export const filterMembersInCurrentTeam = createSelector(
    getProfilesInCurrentTeam,
    getCurrentUser,
    (state, matchTerm) => matchTerm,
    (profilesInTeam, currentUser, matchTerm) => {
        if (matchTerm === null) {
            return null;
        }

        // FIXME: We need to include the currentUser here as is not in profilesInTeam on the redux store
        let profiles;
        if (matchTerm) {
            profiles = [...profilesInTeam, currentUser].filter((p) => {
                return (p.username.toLowerCase().includes(matchTerm) || p.email.toLowerCase().includes(matchTerm) ||
                    p.first_name.toLowerCase().includes(matchTerm) || p.last_name.toLowerCase().includes(matchTerm));
            });
        } else {
            profiles = [...profilesInTeam, currentUser];
        }

        return profiles.sort(sortByUsername).map((p) => p.id);
    }
);

export const filterMyChannels = createSelector(
    getMyChannels,
    (state, opts) => opts,
    (myChannels, matchTerm) => {
        if (matchTerm === null) {
            return null;
        }

        let channels;
        if (matchTerm) {
            channels = myChannels.filter((c) => {
                return (c.type === General.OPEN_CHANNEL || c.type === General.PRIVATE_CHANNEL) &&
                    (c.name.startsWith(matchTerm) || c.display_name.startsWith(matchTerm));
            });
        } else {
            channels = myChannels.filter((c) => {
                return (c.type === General.OPEN_CHANNEL || c.type === General.PRIVATE_CHANNEL);
            });
        }

        return channels.map((c) => c.id);
    }
);

export const filterOtherChannels = createSelector(
    getOtherChannels,
    (state, matchTerm) => matchTerm,
    (otherChannels, matchTerm) => {
        if (matchTerm === null) {
            return null;
        }

        let channels;
        if (matchTerm) {
            channels = otherChannels.filter((c) => {
                return (c.name.startsWith(matchTerm) || c.display_name.startsWith(matchTerm));
            });
        } else {
            channels = otherChannels;
        }

        return channels.map((c) => c.id);
    }
);

export const filterPublicChannels = createSelector(
    getMyChannels,
    getOtherChannels,
    getCurrentLocale,
    (state, matchTerm) => matchTerm,
    (myChannels, otherChannels, locale, matchTerm) => {
        if (matchTerm === null) {
            return null;
        }

        let channels;
        if (matchTerm) {
            channels = myChannels.filter((c) => {
                return c.type === General.OPEN_CHANNEL &&
                    (c.name.startsWith(matchTerm) || c.display_name.startsWith(matchTerm));
            }).concat(
                otherChannels.filter((c) => c.name.startsWith(matchTerm) || c.display_name.startsWith(matchTerm))
            );
        } else {
            channels = myChannels.filter((c) => {
                return (c.type === General.OPEN_CHANNEL);
            }).concat(otherChannels);
        }

        return channels.sort(sortChannelsByDisplayName.bind(null, locale)).map((c) => c.id);
    }
);

export const filterPrivateChannels = createSelector(
    getMyChannels,
    (state, matchTerm) => matchTerm,
    (myChannels, matchTerm) => {
        if (matchTerm === null) {
            return null;
        }

        let channels;
        if (matchTerm) {
            channels = myChannels.filter((c) => {
                return c.type === General.PRIVATE_CHANNEL &&
                    (c.name.startsWith(matchTerm) || c.display_name.startsWith(matchTerm));
            });
        } else {
            channels = myChannels.filter((c) => {
                return c.type === General.PRIVATE_CHANNEL;
            });
        }

        return channels.map((c) => c.id);
    }
);
