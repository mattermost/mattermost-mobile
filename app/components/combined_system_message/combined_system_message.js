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
        }).isRequired,
        allUserIds: PropTypes.array.isRequired,
        currentUserId: PropTypes.string.isRequired,
        linkStyle: CustomPropTypes.Style,
        messageData: PropTypes.array.isRequired,
        teammateNameDisplay: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
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
        this.loadUserProfiles(this.props.allUserIds);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.allUserIds !== nextProps.allUserIds) {
            this.loadUserProfiles(nextProps.allUserIds);
        }
    }

    loadUserProfiles = async (allUserIds) => {
        const {actions} = this.props;
        const {data: userProfiles} = await actions.getProfilesByIds(allUserIds);

        this.setState({userProfiles});
    }

    getAllUsersDisplayName = () => {
        const {userProfiles} = this.state;
        const {
            allUserIds,
            currentUserId,
            teammateNameDisplay,
        } = this.props;
        const {formatMessage} = this.context.intl;
        const usersDisplayName = userProfiles.reduce((acc, user) => {
            acc[user.id] = displayUsername(user, teammateNameDisplay, true);
            return acc;
        }, {});

        const includesCurrentUser = allUserIds.includes(currentUserId);
        if (includesCurrentUser) {
            usersDisplayName[currentUserId] = formatMessage({id: 'mobile.combined_system_message.you', defaultMessage: 'You'});
        }

        return usersDisplayName;
    }

    getDisplayNameByIds = (userIds = []) => {
        const {currentUserId} = this.props;
        const usersDisplayName = this.getAllUsersDisplayName();

        const displayNames = userIds.
            filter((userId) => {
                return userId !== currentUserId;
            }).
            map((userId) => {
                return usersDisplayName[userId];
            });

        const includesCurrentUser = userIds.includes(currentUserId);
        if (includesCurrentUser) {
            displayNames.unshift(usersDisplayName[currentUserId]);
        }

        return displayNames;
    }

    renderSystemMessage(postType, userIds, actorId, style) {
        const usersDisplayName = this.getDisplayNameByIds(userIds);
        let actorDisplayName = actorId ? this.getDisplayNameByIds([actorId])[0] : '';
        if (actorDisplayName && actorId === this.props.currentUserId) {
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
                userIds[0] === this.props.currentUserId &&
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
        } else {
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
            <Text>
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
                </Text>
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

        return (
            <React.Fragment>
                {messageData.map(({postType, userIds, actorId}) => {
                    return (
                        <React.Fragment key={postType + actorId}>
                            {this.renderSystemMessage(postType, userIds, actorId, {activityType: style.activityType, link: linkStyle})}
                        </React.Fragment>
                    );
                })}
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
    };
});
