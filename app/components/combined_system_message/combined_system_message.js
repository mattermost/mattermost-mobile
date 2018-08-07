// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {intlShape} from 'react-intl';

import {Posts} from 'mattermost-redux/constants';

import {makeStyleSheetFromTheme} from 'app/utils/theme';

import Markdown from 'app/components/markdown';

import LastUsers from './last_users';

const {
    JOIN_CHANNEL, ADD_TO_CHANNEL, REMOVE_FROM_CHANNEL, LEAVE_CHANNEL,
    JOIN_TEAM, ADD_TO_TEAM, REMOVE_FROM_TEAM, LEAVE_TEAM,
} = Posts.POST_TYPES;

const postTypeMessage = {
    [JOIN_CHANNEL]: {
        one: {
            id: 'combined_system_message.joined_channel.one',
            defaultMessage: '{firstUser} **joined the channel**.',
        },
        two: {
            id: 'combined_system_message.joined_channel.two',
            defaultMessage: '{firstUser} and {secondUser} **joined the channel**.',
        },
        many_expanded: {
            id: 'combined_system_message.joined_channel.many_expanded',
            defaultMessage: '{users} and {lastUser} **joined the channel**.',
        },
    },
    [ADD_TO_CHANNEL]: {
        one: {
            id: 'combined_system_message.added_to_channel.one',
            defaultMessage: '{firstUser} **added to the channel** by {actor}.',
        },
        one_you: {
            id: 'combined_system_message.added_to_channel.one_you',
            defaultMessage: 'You were **added to the channel** by {actor}.',
        },
        two: {
            id: 'combined_system_message.added_to_channel.two',
            defaultMessage: '{firstUser} and {secondUser} **added to the channel** by {actor}.',
        },
        many_expanded: {
            id: 'combined_system_message.added_to_channel.many_expanded',
            defaultMessage: '{users} and {lastUser} were **added to the channel** by {actor}.',
        },
    },
    [REMOVE_FROM_CHANNEL]: {
        one: {
            id: 'combined_system_message.removed_from_channel.one',
            defaultMessage: '{firstUser} was **removed from the channel**.',
        },
        one_you: {
            id: 'combined_system_message.removed_from_channel.one_you',
            defaultMessage: 'You were **removed from the channel**.',
        },
        two: {
            id: 'combined_system_message.removed_from_channel.two',
            defaultMessage: '{firstUser} and {secondUser} were **removed from the channel**.',
        },
        many_expanded: {
            id: 'combined_system_message.removed_from_channel.many_expanded',
            defaultMessage: '{users} and {lastUser} were **removed from the channel**.',
        },
    },
    [LEAVE_CHANNEL]: {
        one: {
            id: 'combined_system_message.left_channel.one',
            defaultMessage: '{firstUser} **left the channel**.',
        },
        two: {
            id: 'combined_system_message.left_channel.two',
            defaultMessage: '{firstUser} and {secondUser} **left the channel**.',
        },
        many_expanded: {
            id: 'combined_system_message.left_channel.many_expanded',
            defaultMessage: '{users} and {lastUser} **left the channel**.',
        },
    },
    [JOIN_TEAM]: {
        one: {
            id: 'combined_system_message.joined_team.one',
            defaultMessage: '{firstUser} **joined the team**.',
        },
        two: {
            id: 'combined_system_message.joined_team.two',
            defaultMessage: '{firstUser} and {secondUser} **joined the team**.',
        },
        many_expanded: {
            id: 'combined_system_message.joined_team.many_expanded',
            defaultMessage: '{users} and {lastUser} **joined the team**.',
        },
    },
    [ADD_TO_TEAM]: {
        one: {
            id: 'combined_system_message.added_to_team.one',
            defaultMessage: '{firstUser} **added to the team** by {actor}.',
        },
        one_you: {
            id: 'combined_system_message.added_to_team.one_you',
            defaultMessage: 'You were **added to the team** by {actor}.',
        },
        two: {
            id: 'combined_system_message.added_to_team.two',
            defaultMessage: '{firstUser} and {secondUser} **added to the team** by {actor}.',
        },
        many_expanded: {
            id: 'combined_system_message.added_to_team.many_expanded',
            defaultMessage: '{users} and {lastUser} were **added to the team** by {actor}.',
        },
    },
    [REMOVE_FROM_TEAM]: {
        one: {
            id: 'combined_system_message.removed_from_team.one',
            defaultMessage: '{firstUser} was **removed from the team**.',
        },
        one_you: {
            id: 'combined_system_message.removed_from_team.one_you',
            defaultMessage: 'You were **removed from the team**.',
        },
        two: {
            id: 'combined_system_message.removed_from_team.two',
            defaultMessage: '{firstUser} and {secondUser} were **removed from the team**.',
        },
        many_expanded: {
            id: 'combined_system_message.removed_from_team.many_expanded',
            defaultMessage: '{users} and {lastUser} were **removed from the team**.',
        },
    },
    [LEAVE_TEAM]: {
        one: {
            id: 'combined_system_message.left_team.one',
            defaultMessage: '{firstUser} **left the team**.',
        },
        two: {
            id: 'combined_system_message.left_team.two',
            defaultMessage: '{firstUser} and {secondUser} **left the team**.',
        },
        many_expanded: {
            id: 'combined_system_message.left_team.many_expanded',
            defaultMessage: '{users} and {lastUser} **left the team**.',
        },
    },
};

export default class CombinedSystemMessage extends React.PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            getMissingProfilesByIds: PropTypes.func.isRequired,
            getMissingProfilesByUsernames: PropTypes.func.isRequired,
        }).isRequired,
        allUserIds: PropTypes.array.isRequired,
        allUsernames: PropTypes.array.isRequired,
        currentUserId: PropTypes.string.isRequired,
        currentUsername: PropTypes.string.isRequired,
        messageData: PropTypes.array.isRequired,
        navigator: PropTypes.object.isRequired,
        showJoinLeave: PropTypes.bool.isRequired,
        textStyles: PropTypes.object,
        theme: PropTypes.object.isRequired,
        userProfiles: PropTypes.array.isRequired,
    };

    static defaultProps = {
        allUserIds: [],
        allUsernames: [],
    };

    static contextTypes = {
        intl: intlShape,
    };

    componentDidMount() {
        this.loadUserProfiles(this.props.allUserIds, this.props.allUsernames);
    }

    componentDidUpdate(prevProps) {
        const {allUserIds, allUsernames} = this.props;
        if (allUserIds !== prevProps.allUserIds || allUsernames !== prevProps.allUsernames) {
            this.loadUserProfiles(allUserIds, allUsernames);
        }
    }

    loadUserProfiles = (allUserIds, allUsernames) => {
        if (allUserIds.length > 0) {
            this.props.actions.getMissingProfilesByIds(allUserIds);
        }

        if (allUsernames.length > 0) {
            this.props.actions.getMissingProfilesByUsernames(allUsernames);
        }
    }

    getAllUsernames = () => {
        const {
            allUserIds,
            allUsernames,
            currentUserId,
            currentUsername,
            userProfiles,
        } = this.props;
        const {formatMessage} = this.context.intl;
        const usernames = userProfiles.reduce((acc, user) => {
            acc[user.id] = user.username;
            acc[user.username] = user.username;
            return acc;
        }, {});

        const currentUserDisplayName = formatMessage({id: 'combined_system_message.you', defaultMessage: 'You'});
        if (allUserIds.includes(currentUserId)) {
            usernames[currentUserId] = currentUserDisplayName;
        } else if (allUsernames.includes(currentUsername)) {
            usernames[currentUsername] = currentUserDisplayName;
        }

        return usernames;
    }

    getUsernamesByIds = (userIds = []) => {
        const {currentUserId, currentUsername} = this.props;
        const allUsernames = this.getAllUsernames();
        const usernames = userIds.
            filter((userId) => {
                return userId !== currentUserId && userId !== currentUsername;
            }).
            map((userId) => {
                return `@${allUsernames[userId]}`;
            }).filter((username) => {
                return username && username !== '';
            });

        if (userIds.includes(currentUserId)) {
            usernames.unshift(allUsernames[currentUserId]);
        } else if (userIds.includes(currentUsername)) {
            usernames.unshift(allUsernames[currentUsername]);
        }

        return usernames;
    }

    renderFormattedMessage(postType, userIds, actorId, style) {
        const {formatMessage} = this.context.intl;
        const {
            currentUserId,
            currentUsername,
            navigator,
            textStyles,
            theme,
        } = this.props;
        const usernames = this.getUsernamesByIds(userIds);
        let actor = actorId ? this.getUsernamesByIds([actorId])[0] : '';
        if (actor && (actorId === currentUserId || actorId === currentUsername)) {
            actor = actor.toLowerCase();
        }

        const firstUser = usernames[0];
        const secondUser = usernames[1];
        const numOthers = usernames.length - 1;

        if (numOthers > 1) {
            return (
                <LastUsers
                    actor={actor}
                    expandedLocale={postTypeMessage[postType].many_expanded}
                    navigator={navigator}
                    postType={postType}
                    style={style}
                    textStyles={textStyles}
                    theme={theme}
                    usernames={usernames}
                />
            );
        }

        let localeHolder;
        if (numOthers === 0) {
            localeHolder = postTypeMessage[postType].one;

            if (
                (userIds[0] === currentUserId || userIds[0] === currentUsername) &&
                postTypeMessage[postType].one_you
            ) {
                localeHolder = postTypeMessage[postType].one_you;
            }
        } else if (numOthers === 1) {
            localeHolder = postTypeMessage[postType].two;
        }

        const formattedMessage = formatMessage(localeHolder, {firstUser, secondUser, actor});

        return (
            <Markdown
                baseTextStyle={style.baseText}
                navigator={navigator}
                textStyles={textStyles}
                value={formattedMessage}
            />
        );
    }

    renderMessage(postType, userIds, actorId, style) {
        return (
            <React.Fragment key={postType + actorId}>
                {this.renderFormattedMessage(postType, userIds, actorId, {baseText: style.baseText, linkText: style.linkText})}
            </React.Fragment>
        );
    }

    render() {
        const {
            currentUserId,
            messageData,
            theme,
        } = this.props;
        const style = getStyleSheet(theme);

        const content = [];
        const removedUserIds = [];
        for (const message of messageData) {
            const {
                postType,
                actorId,
            } = message;
            let userIds = message.userIds;

            if (!this.props.showJoinLeave && actorId !== currentUserId) {
                const affectsCurrentUser = userIds.indexOf(currentUserId) !== -1;

                if (affectsCurrentUser) {
                    // Only show the message that the current user was added, etc
                    userIds = [currentUserId];
                } else {
                    // Not something the current user did or was affected by
                    continue;
                }
            }

            if (postType === REMOVE_FROM_CHANNEL) {
                removedUserIds.push(...userIds);
                continue;
            }

            content.push(this.renderMessage(postType, userIds, actorId, style));
        }

        if (removedUserIds.length > 0) {
            const uniqueRemovedUserIds = removedUserIds.filter((id, index, arr) => arr.indexOf(id) === index);
            content.push(this.renderMessage(REMOVE_FROM_CHANNEL, uniqueRemovedUserIds, currentUserId, style));
        }

        return (
            <React.Fragment>
                {content}
            </React.Fragment>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        baseText: {
            color: theme.centerChannelColor,
            opacity: 0.6,
        },
        linkText: {
            color: theme.linkColor,
            opacity: 0.8,
        },
    };
});
