// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {Text} from 'react-native';

import {Posts} from 'mattermost-redux/constants';

import FormattedText from 'app/components/formatted_text';

const typeMessage = {
    [Posts.POST_TYPES.ADD_TO_CHANNEL]: {
        id: ['mobile.combined_system_message.were', 'mobile.combined_system_message.added_to_channel', 'mobile.combined_system_message.by_actor'],
        defaultMessage: ['were ', 'added to the channel', ' by {actor}.'],
    },
    [Posts.POST_TYPES.JOIN_CHANNEL]: {
        id: ['', 'mobile.combined_system_message.joined_channel'],
        defaultMessage: ['', 'joined the channel'],
    },
    [Posts.POST_TYPES.LEAVE_CHANNEL]: {
        id: ['', 'mobile.combined_system_message.left_channel', ''],
        defaultMessage: ['', 'left the channel'],
    },
    [Posts.POST_TYPES.REMOVE_FROM_CHANNEL]: {
        id: ['mobile.combined_system_message.were', 'mobile.combined_system_message.removed_from_channel'],
        defaultMessage: ['were ', 'removed from the channel'],
    },
    [Posts.POST_TYPES.ADD_TO_TEAM]: {
        id: ['mobile.combined_system_message.were', 'mobile.combined_system_message.added_to_team', 'mobile.combined_system_message.by_actor'],
        defaultMessage: ['were ', 'added to the team', ' by {actor}.'],
    },
    [Posts.POST_TYPES.JOIN_TEAM]: {
        id: ['', 'mobile.combined_system_message.joined_team'],
        defaultMessage: ['', 'joined the team'],
    },
    [Posts.POST_TYPES.LEAVE_TEAM]: {
        id: ['', 'mobile.combined_system_message.left_team'],
        defaultMessage: ['', 'left the team'],
    },
    [Posts.POST_TYPES.REMOVE_FROM_TEAM]: {
        id: ['', 'mobile.combined_system_message.removed_from_team'],
        defaultMessage: ['were ', 'removed from the team'],
    },
};

export default class LastUsers extends React.PureComponent {
    static propTypes = {
        actor: PropTypes.string,
        expandedLocale: PropTypes.object.isRequired,
        postType: PropTypes.string.isRequired,
        style: PropTypes.object.isRequired,
        userDisplayNames: PropTypes.array.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            expand: false,
        };
    }

    handleOnClick = (e) => {
        e.preventDefault();

        this.setState({expand: true});
    }

    renderExpandedView = (expandedLocale, userDisplayNames, actor, lastIndex, style) => {
        return (
            <Text>
                <FormattedText
                    id={expandedLocale.id[0]}
                    defaultMessage={expandedLocale.defaultMessage[0]}
                    values={{
                        users: userDisplayNames.slice(0, lastIndex).join(', '),
                        lastUser: userDisplayNames[lastIndex],
                    }}
                />
                <Text style={style.activityType}>
                    <FormattedText
                        id={expandedLocale.id[1]}
                        defaultMessage={expandedLocale.defaultMessage[1]}
                    />
                </Text>
                {expandedLocale.id[2] ? (
                    <FormattedText
                        id={expandedLocale.id[2]}
                        defaultMessage={expandedLocale.defaultMessage[2]}
                        values={{actor}}
                    />
                ) : ('.')
                }
            </Text>
        );
    }

    renderCollapsedView = (postType, userDisplayNames, actor, lastIndex, style) => {
        return (
            <Text>
                <FormattedText
                    id={'mobile.combined_system_message.first_user_and'}
                    defaultMessage={'{firstUser} and '}
                    values={{firstUser: userDisplayNames[0]}}
                />
                <Text
                    style={style.link}
                    onPress={this.handleOnClick}
                >
                    <FormattedText
                        id={'mobile.combined_system_message.others'}
                        defaultMessage={'{numOthers} others '}
                        values={{numOthers: lastIndex}}
                    />
                </Text>
                {typeMessage[postType].id[0] &&
                <FormattedText
                    id={typeMessage[postType].id[0]}
                    defaultMessage={typeMessage[postType].defaultMessage[0]}
                />
                }
                <Text style={style.activityType}>
                    <FormattedText
                        id={typeMessage[postType].id[1]}
                        defaultMessage={typeMessage[postType].defaultMessage[1]}
                    />
                </Text>
                {typeMessage[postType].id[2] ? (
                    <FormattedText
                        id={typeMessage[postType].id[2]}
                        defaultMessage={typeMessage[postType].defaultMessage[2]}
                        values={{actor}}
                    />
                ) : ('.')
                }
            </Text>
        );
    }

    render() {
        const {expand} = this.state;
        const {
            actor,
            expandedLocale,
            postType,
            userDisplayNames,
            style,
        } = this.props;

        const lastIndex = userDisplayNames.length - 1;

        if (expand) {
            return this.renderExpandedView(expandedLocale, userDisplayNames, actor, lastIndex, style);
        }

        return this.renderCollapsedView(postType, userDisplayNames, actor, lastIndex, style);
    }
}
