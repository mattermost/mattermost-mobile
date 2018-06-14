// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {Text} from 'react-native';
import {intlShape} from 'react-intl';

import {Posts} from 'mattermost-redux/constants';
import {displayUsername} from 'mattermost-redux/utils/user_utils';

import CustomPropTypes from 'app/constants/custom_prop_types';

import {makeStyleSheetFromTheme} from 'app/utils/theme';

import FormattedText from 'app/components/formatted_text';

import LastUsers from './last_users';

const {
    JOIN_CHANNEL, ADD_TO_CHANNEL, REMOVE_FROM_CHANNEL, LEAVE_CHANNEL,
    JOIN_TEAM, ADD_TO_TEAM, REMOVE_FROM_TEAM, LEAVE_TEAM,
} = Posts.POST_TYPES;

const postTypeMessage = {
    [JOIN_CHANNEL]: {
        one: {
            id: ['mobile.combined_system_message.first_user', 'mobile.combined_system_message.joined_channel'],
            defaultMessage: ['{firstUser} ', 'joined the channel'],
        },
        two: {
            id: ['mobile.combined_system_message.first_user_and_second_user', 'mobile.combined_system_message.joined_channel'],
            defaultMessage: ['{firstUser} and {secondUser} ', 'joined the channel'],
        },
        many_expanded: {
            id: ['mobile.combined_system_message.users_and_last_user', 'mobile.combined_system_message.joined_channel'],
            defaultMessage: ['{users} and {lastUser} ', 'joined the channel'],
        },
    },
    [ADD_TO_CHANNEL]: {
        one: {
            id: ['mobile.combined_system_message.first_user', 'mobile.combined_system_message.added_to_channel', 'mobile.combined_system_message.by_actor'],
            defaultMessage: ['{firstUser} ', 'added to the channel', ' by {actor}.'],
        },
        one_you: {
            id: ['mobile.combined_system_message.you_were', 'mobile.combined_system_message.added_to_channel', 'mobile.combined_system_message.by_actor'],
            defaultMessage: ['You were ', 'added to the channel', ' by {actor}.'],
        },
        two: {
            id: ['mobile.combined_system_message.first_user_and_second_user', 'mobile.combined_system_message.added_to_channel', 'mobile.combined_system_message.by_actor'],
            defaultMessage: ['{firstUser} and {secondUser} ', 'added to the channel', ' by {actor}.'],
        },
        many_expanded: {
            id: ['mobile.combined_system_message.users_and_last_user', 'mobile.combined_system_message.added_to_channel', 'mobile.combined_system_message.by_actor'],
            defaultMessage: ['{users} and {lastUser} ', 'added to the channel', ' by {actor}.'],
        },
    },
    [REMOVE_FROM_CHANNEL]: {
        one: {
            id: ['mobile.combined_system_message.first_user_was', 'mobile.combined_system_message.removed_from_channel'],
            defaultMessage: ['{firstUser} was ', 'removed from the channel'],
        },
        one_you: {
            id: ['mobile.combined_system_message.you_were', 'mobile.combined_system_message.removed_from_channel'],
            defaultMessage: ['You were ', 'removed from the channel'],
        },
        two: {
            id: ['mobile.combined_system_message.first_user_and_second_user_were', 'mobile.combined_system_message.removed_from_channel'],
            defaultMessage: ['{firstUser} and {secondUser} were ', 'removed from the channel'],
        },
        many_expanded: {
            id: ['mobile.combined_system_message.users_and_last_user_were', 'mobile.combined_system_message.removed_from_channel'],
            defaultMessage: ['{users} and {lastUser} were ', 'removed from the channel'],
        },
    },
    [LEAVE_CHANNEL]: {
        one: {
            id: ['mobile.combined_system_message.first_user', 'mobile.combined_system_message.left_channel'],
            defaultMessage: ['{firstUser} ', 'left the channel'],
        },
        two: {
            id: ['mobile.combined_system_message.first_user_and_second_user', 'mobile.combined_system_message.left_channel'],
            defaultMessage: ['{firstUser} and {secondUser} ', 'left the channel'],
        },
        many_expanded: {
            id: ['mobile.combined_system_message.users_and_last_user', 'mobile.combined_system_message.left_channel'],
            defaultMessage: ['{users} and {lastUser} ', 'left the channel'],
        },
    },
    [JOIN_TEAM]: {
        one: {
            id: ['mobile.combined_system_message.first_user', 'mobile.combined_system_message.joined_team'],
            defaultMessage: ['{firstUser} ', 'joined the team'],
        },
        two: {
            id: ['mobile.combined_system_message.first_user_and_second_user', 'mobile.combined_system_message.joined_team'],
            defaultMessage: ['{firstUser} and {secondUser} ', 'joined the team'],
        },
        many_expanded: {
            id: ['mobile.combined_system_message.users_and_last_user', 'mobile.combined_system_message.joined_team'],
            defaultMessage: ['{users} and {lastUser} ', 'joined the team'],
        },
    },
    [ADD_TO_TEAM]: {
        one: {
            id: ['mobile.combined_system_message.first_user', 'mobile.combined_system_message.added_to_team', 'mobile.combined_system_message.by_actor'],
            defaultMessage: ['{firstUser} ', 'added to the team', ' by {actor}.'],
        },
        one_you: {
            id: ['mobile.combined_system_message.you_were', 'mobile.combined_system_message.added_to_team', 'mobile.combined_system_message.by_actor'],
            defaultMessage: ['You were ', 'added to the team', ' by {actor}.'],
        },
        two: {
            id: ['mobile.combined_system_message.first_user_and_second_user', 'mobile.combined_system_message.added_to_team', 'mobile.combined_system_message.by_actor'],
            defaultMessage: ['{firstUser} and {secondUser} ', 'added to the team', ' by {actor}.'],
        },
        many_expanded: {
            id: ['mobile.combined_system_message.users_and_last_user', 'mobile.combined_system_message.added_to_team', 'mobile.combined_system_message.by_actor'],
            defaultMessage: ['{users} and {lastUser} ', 'added to the team', ' by {actor}.'],
        },
    },
    [REMOVE_FROM_TEAM]: {
        one: {
            id: ['mobile.combined_system_message.first_user_was', 'mobile.combined_system_message.removed_from_team'],
            defaultMessage: ['{firstUser} was ', 'removed from the team'],
        },
        one_you: {
            id: ['mobile.combined_system_message.you_were', 'mobile.combined_system_message.removed_from_team'],
            defaultMessage: ['You were ', 'removed from the team'],
        },
        two: {
            id: ['mobile.combined_system_message.first_user_and_second_user_were', 'mobile.combined_system_message.removed_from_team'],
            defaultMessage: ['{firstUser} and {secondUser} were ', 'removed from the team'],
        },
        many_expanded: {
            id: ['mobile.combined_system_message.users_and_last_user_were', 'mobile.combined_system_message.removed_from_team'],
            defaultMessage: ['{users} and {lastUser} were ', 'removed from the team'],
        },
    },
    [LEAVE_TEAM]: {
        one: {
            id: ['mobile.combined_system_message.first_user', 'mobile.combined_system_message.left_team'],
            defaultMessage: ['{firstUser} ', 'left the team'],
        },
        two: {
            id: ['mobile.combined_system_message.first_user_and_second_user', 'mobile.combined_system_message.left_team'],
            defaultMessage: ['{firstUser} and {secondUser} ', 'left the team'],
        },
        many_expanded: {
            id: ['mobile.combined_system_message.users_and_last_user', 'mobile.combined_system_message.left_team'],
            defaultMessage: ['{users} and {lastUser} ', 'left the team'],
        },
    },
};

export default class CombinedSystemMessage extends React.PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            getProfilesByIds: PropTypes.func.isRequired,
            getProfilesByUsernames: PropTypes.func.isRequired,
        }).isRequired,
        allUserIds: PropTypes.array.isRequired,
        allUsernames: PropTypes.array.isRequired,
        currentUserId: PropTypes.string.isRequired,
        currentUsername: PropTypes.string.isRequired,
        linkStyle: CustomPropTypes.Style,
        messageData: PropTypes.array.isRequired,
        showJoinLeave: PropTypes.bool.isRequired,
        teammateNameDisplay: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        allUserIds: [],
        allUsernames: [],
    };

    static contextTypes = {
        intl: intlShape,
    };

    constructor(props) {
        super(props);

        this.state = {
            userProfiles: [],
        };
    }

    componentDidMount() {
        this.loadUserProfiles(this.props.allUserIds, this.props.allUsernames);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.allUserIds !== nextProps.allUserIds || this.props.allUsernames !== nextProps.allUsernames) {
            this.loadUserProfiles(nextProps.allUserIds, nextProps.allUsernames);
        }
    }

    loadUserProfiles = async (allUserIds, allUsernames) => {
        const {actions} = this.props;
        const userProfiles = [];
        if (allUserIds.length > 0) {
            const {data} = await actions.getProfilesByIds(allUserIds);
            if (data.length > 0) {
                userProfiles.push(...data);
            }
        }

        if (allUsernames.length > 0) {
            const {data} = await actions.getProfilesByUsernames(allUsernames);
            if (data.length > 0) {
                userProfiles.push(...data);
            }
        }

        this.setState({userProfiles});
    }

    getAllUsersDisplayName = () => {
        const {userProfiles} = this.state;
        const {
            allUserIds,
            allUsernames,
            currentUserId,
            currentUsername,
            teammateNameDisplay,
        } = this.props;
        const {formatMessage} = this.context.intl;
        const usersDisplayName = userProfiles.reduce((acc, user) => {
            const displayName = displayUsername(user, teammateNameDisplay, true);
            acc[user.id] = displayName;
            acc[user.username] = displayName;
            return acc;
        }, {});

        if (allUserIds.includes(currentUserId)) {
            usersDisplayName[currentUserId] = formatMessage({id: 'mobile.combined_system_message.you', defaultMessage: 'You'});
        } else if (allUsernames.includes(currentUsername)) {
            usersDisplayName[currentUsername] = formatMessage({id: 'mobile.combined_system_message.you', defaultMessage: 'You'});
        }

        return usersDisplayName;
    }

    getDisplayNameByIds = (userIds = []) => {
        const {currentUserId, currentUsername} = this.props;
        const usersDisplayName = this.getAllUsersDisplayName();
        const displayNames = userIds.
            filter((userId) => {
                return userId !== currentUserId && userId !== currentUsername;
            }).
            map((userId) => {
                return usersDisplayName[userId];
            }).filter((displayName) => {
                return displayName && displayName !== '';
            });

        if (userIds.includes(currentUserId)) {
            displayNames.unshift(usersDisplayName[currentUserId]);
        } else if (userIds.includes(currentUsername)) {
            displayNames.unshift(usersDisplayName[currentUsername]);
        }

        return displayNames;
    }

    renderSystemMessage(postType, userIds, actorId, style) {
        const {currentUserId, currentUsername} = this.props;
        const usersDisplayName = this.getDisplayNameByIds(userIds);
        let actorDisplayName = actorId ? this.getDisplayNameByIds([actorId])[0] : '';
        if (actorDisplayName && (actorId === currentUserId || actorId === currentUsername)) {
            actorDisplayName = actorDisplayName.toLowerCase();
        }

        const firstUser = usersDisplayName[0];
        const numOthers = usersDisplayName.length - 1;

        let formattedMessage;
        if (numOthers === 0) {
            formattedMessage = this.renderFormattedMessage(
                postTypeMessage[postType].one,
                firstUser,
                null,
                actorDisplayName,
                style,
            );

            if (
                (userIds[0] === currentUserId || userIds[0] === currentUsername) &&
                postTypeMessage[postType].one_you
            ) {
                formattedMessage = this.renderFormattedMessage(
                    postTypeMessage[postType].one_you,
                    null,
                    null,
                    actorDisplayName,
                    style,
                );
            }
        } else if (numOthers === 1) {
            formattedMessage = this.renderFormattedMessage(
                postTypeMessage[postType].two,
                firstUser,
                usersDisplayName[1],
                actorDisplayName,
                style,
            );
        } else if (numOthers > 1) {
            formattedMessage = (
                <LastUsers
                    actor={actorDisplayName}
                    expandedLocale={postTypeMessage[postType].many_expanded}
                    postType={postType}
                    style={style}
                    userDisplayNames={usersDisplayName}
                />
            );
        }

        return formattedMessage;
    }

    renderFormattedMessage = (localeFormat, firstUser, secondUser, actor, style) => {
        return (
            <Text style={style.text}>
                <FormattedText
                    id={localeFormat.id[0]}
                    defaultMessage={localeFormat.defaultMessage[0]}
                    values={{
                        firstUser,
                        secondUser,
                    }}
                />
                <Text style={style.activityType}>
                    <FormattedText
                        id={localeFormat.id[1]}
                        defaultMessage={localeFormat.defaultMessage[1]}
                    />
                </Text >
                {localeFormat.id[2] ? (
                    <FormattedText
                        id={localeFormat.id[2]}
                        defaultMessage={localeFormat.defaultMessage[2]}
                        values={{actor}}
                    />
                ) : ('.')
                }
            </Text>
        );
    }

    render() {
        const {
            linkStyle,
            messageData,
            theme,
        } = this.props;
        const style = getStyleSheet(theme);

        const content = [];
        for (const message of messageData) {
            const {
                postType,
                actorId,
            } = message;
            let userIds = message.userIds;

            if (!this.props.showJoinLeave && actorId !== this.props.currentUserId) {
                const affectsCurrentUser = userIds.indexOf(this.props.currentUserId) !== -1;

                if (affectsCurrentUser) {
                    // Only show the message that the current user was added, etc
                    userIds = [this.props.currentUserId];
                } else {
                    // Not something the current user did or was affected by
                    continue;
                }
            }

            content.push(
                <React.Fragment key={postType + actorId}>
                    {this.renderSystemMessage(postType, userIds, actorId, {activityType: style.activityType, link: linkStyle, text: style.text})}
                </React.Fragment>
            );
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
        activityType: {
            color: theme.centerChannelColor,
            fontSize: 14,
            fontWeight: 'bold',
        },
        text: {
            color: theme.centerChannelColor,
            opacity: 0.6,
        },
    };
});
