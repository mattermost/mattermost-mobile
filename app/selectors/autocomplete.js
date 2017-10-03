// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {createSelector} from 'reselect';

import {General} from 'mattermost-redux/constants';
import {getMyChannels, getOtherChannels} from 'mattermost-redux/selectors/entities/channels';
import {
    getCurrentUser, getProfilesInCurrentChannel,
    getProfilesNotInCurrentChannel, getProfilesInCurrentTeam
} from 'mattermost-redux/selectors/entities/users';
import {sortChannelsByDisplayName} from 'mattermost-redux/utils/channel_utils';
import {sortByUsername} from 'mattermost-redux/utils/user_utils';

import {getCurrentUserLocale} from 'app/selectors/i18n';

export const filterMembersInChannel = createSelector(
    getProfilesInCurrentChannel,
    (state, opts) => opts,
    (profilesInChannel, opts) => {
        const {array} = opts;
        array.splice(0, array.length);

        let profiles;
        const matchTerm = opts.matchTerm;
        if (matchTerm) {
            profiles = profilesInChannel.filter((p) => {
                return ((p.id !== opts.currentUserId) && (
                    p.username.toLowerCase().includes(matchTerm) || p.email.toLowerCase().includes(matchTerm) ||
                    p.first_name.toLowerCase().includes(matchTerm) || p.last_name.toLowerCase().includes(matchTerm)));
            });
        } else {
            profiles = profilesInChannel.filter((p) => p.id !== opts.currentUserId);
        }

        profiles.sort(sortByUsername).forEach((p) => {
            array.push(p.id);
        });

        return array;
    }
);

export const filterMembersNotInChannel = createSelector(
    getProfilesNotInCurrentChannel,
    (state, opts) => opts,
    (profilesNotInChannel, opts) => {
        const {array} = opts;
        array.splice(0, array.length);

        let profiles;
        const matchTerm = opts.matchTerm;
        if (matchTerm) {
            profiles = profilesNotInChannel.filter((p) => {
                return ((p.id !== opts.currentUserId) && (
                    p.username.toLowerCase().includes(matchTerm) || p.email.toLowerCase().includes(matchTerm) ||
                    p.first_name.toLowerCase().includes(matchTerm) || p.last_name.toLowerCase().includes(matchTerm)));
            });
        } else {
            profiles = profilesNotInChannel;
        }

        profiles.sort(sortByUsername).forEach((p) => {
            array.push(p.id);
        });

        return array;
    }
);

export const filterMembersInCurrentTeam = createSelector(
    getProfilesInCurrentTeam,
    getCurrentUser,
    (state, opts) => opts,
    (profilesInTeam, currentUser, opts) => {
        const {array} = opts;
        array.splice(0, array.length);

        let profiles;
        const matchTerm = opts.matchTerm;
        if (matchTerm) {
            profiles = profilesInTeam.concat(currentUser).filter((p) => {
                return (p.username.toLowerCase().includes(matchTerm) || p.email.toLowerCase().includes(matchTerm) ||
                    p.first_name.toLowerCase().includes(matchTerm) || p.last_name.toLowerCase().includes(matchTerm));
            });
        } else {
            profiles = profilesInTeam.concat(currentUser);
        }

        profiles.sort(sortByUsername).forEach((p) => {
            array.push(p.id);
        });

        return array;
    }
);

export const filterMyChannels = createSelector(
    getMyChannels,
    (state, opts) => opts,
    (myChannels, opts) => {
        const {array} = opts;
        array.splice(0, array.length);

        let channels;
        const matchTerm = opts.matchTerm;
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

        // this channels are already sorted by the selector
        channels.forEach((c) => {
            array.push(c.id);
        });

        return array;
    }
);

export const filterOtherChannels = createSelector(
    getOtherChannels,
    (state, opts) => opts,
    (otherChannels, opts) => {
        const {array} = opts;
        array.splice(0, array.length);

        let channels;
        const matchTerm = opts.matchTerm;
        if (matchTerm) {
            channels = otherChannels.filter((c) => {
                return (c.name.startsWith(matchTerm) || c.display_name.startsWith(matchTerm));
            });
        } else {
            channels = otherChannels;
        }

        // this channels are already sorted by the selector
        channels.forEach((c) => {
            array.push(c.id);
        });

        return array;
    }
);

export const filterPublicChannels = createSelector(
    getMyChannels,
    getOtherChannels,
    getCurrentUserLocale,
    (state, opts) => opts,
    (myChannels, otherChannels, locale, opts) => {
        const {array} = opts;
        array.splice(0, array.length);

        let channels;
        const matchTerm = opts.matchTerm;
        if (matchTerm) {
            channels = myChannels.filter((c) => {
                return c.type === General.OPEN_CHANNEL &&
                    (c.name.startsWith(matchTerm) || c.display_name.startsWith(matchTerm));
            }).concat(
                otherChannels.filter((c) => c.name.startsWith(matchTerm) || c.display_name.startsWith(matchTerm))
            );
        } else {
            channels = myChannels.filter((c) => {
                return (c.type === General.OPEN_CHANNEL || c.type === General.PRIVATE_CHANNEL);
            }).concat(otherChannels);
        }

        channels.sort(sortChannelsByDisplayName.bind(null, locale)).forEach((c) => {
            array.push(c.id);
        });

        return array;
    }
);

export const filterPrivateChannels = createSelector(
    getMyChannels,
    (state, opts) => opts,
    (myChannels, opts) => {
        const {array} = opts;
        array.splice(0, array.length);

        let channels;
        const matchTerm = opts.matchTerm;
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

        // this channels are already sorted by the selector
        channels.forEach((c) => {
            array.push(c.id);
        });

        return array;
    }
);
