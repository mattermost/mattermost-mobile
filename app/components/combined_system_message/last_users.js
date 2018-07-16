// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {Text, StyleSheet} from 'react-native';
import {intlShape} from 'react-intl';

import {Posts} from 'mattermost-redux/constants';

import Markdown from 'app/components/markdown';

const typeMessage = {
    [Posts.POST_TYPES.ADD_TO_CHANNEL]: {
        id: 'last_users_message.added_to_channel.type',
        defaultMessage: 'were **added to the channel** by {actor}.',
    },
    [Posts.POST_TYPES.JOIN_CHANNEL]: {
        id: 'last_users_message.joined_channel.type',
        defaultMessage: '**joined the channel**.',
    },
    [Posts.POST_TYPES.LEAVE_CHANNEL]: {
        id: 'last_users_message.left_channel.type',
        defaultMessage: '**left the channel**.',
    },
    [Posts.POST_TYPES.REMOVE_FROM_CHANNEL]: {
        id: 'last_users_message.removed_from_channel.type',
        defaultMessage: 'were **removed from the channel**.',
    },
    [Posts.POST_TYPES.ADD_TO_TEAM]: {
        id: 'last_users_message.added_to_team.type',
        defaultMessage: 'were **added to the team** by {actor}.',
    },
    [Posts.POST_TYPES.JOIN_TEAM]: {
        id: 'last_users_message.joined_team.type',
        defaultMessage: '**joined the team**.',
    },
    [Posts.POST_TYPES.LEAVE_TEAM]: {
        id: 'last_users_message.left_team.type',
        defaultMessage: '**left the team**.',
    },
    [Posts.POST_TYPES.REMOVE_FROM_TEAM]: {
        id: 'last_users_message.removed_from_team.type',
        defaultMessage: 'were **removed from the team**.',
    },
};

export default class LastUsers extends React.PureComponent {
    static propTypes = {
        actor: PropTypes.string,
        expandedLocale: PropTypes.object.isRequired,
        navigator: PropTypes.object.isRequired,
        postType: PropTypes.string.isRequired,
        style: PropTypes.object.isRequired,
        textStyles: PropTypes.object,
        usernames: PropTypes.array.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            expand: false,
        };
    }

    static contextTypes = {
        intl: intlShape,
    };

    handleOnPress = (e) => {
        e.preventDefault();

        this.setState({expand: true});
    }

    renderExpandedView = () => {
        const {formatMessage} = this.context.intl;
        const {
            actor,
            expandedLocale,
            usernames,
        } = this.props;

        const lastIndex = usernames.length - 1;
        const lastUser = usernames[lastIndex];

        const formattedMessage = formatMessage(expandedLocale, {
            users: usernames.slice(0, lastIndex).join(', '),
            lastUser,
            actor,
        });

        return this.renderMessage(formattedMessage);
    }

    renderCollapsedView = () => {
        const {formatMessage} = this.context.intl;
        const {
            actor,
            postType,
            usernames,
        } = this.props;

        const firstUser = usernames[0];
        const numOthers = usernames.length - 1;

        const formattedStartMessage = formatMessage({id: 'last_users_message.first', defaultMessage: '{firstUser} and '}, {firstUser});
        const formattedMidMessage = formatMessage({id: 'last_users_message.others', defaultMessage: '{numOthers} others '}, {numOthers});
        const formattedEndMessage = formatMessage(typeMessage[postType], {actor});

        return (
            <Text>
                <Text>{this.renderMessage(formattedStartMessage)}</Text>
                <Text>{' '}</Text>
                <Text onPress={this.handleOnPress}>{this.renderCombinedMessage(formattedMidMessage)}</Text>
                <Text>{' '}</Text>
                <Text>{this.renderMessage(formattedEndMessage)}</Text>
            </Text>
        );
    }

    renderMessage = (formattedMessage) => {
        const {
            navigator,
            style,
            textStyles,
        } = this.props;

        return (
            <Markdown
                baseTextStyle={style.baseText}
                navigator={navigator}
                textStyles={textStyles}
                value={formattedMessage}
            />
        );
    }

    renderCombinedMessage = (formattedMessage) => {
        const {
            navigator,
            style,
            textStyles,
        } = this.props;

        return (
            <Markdown
                baseTextStyle={style.linkText}
                navigator={navigator}
                textStyles={textStyles}
                value={formattedMessage}
            />
        );
    }

    render() {
        if (this.state.expand) {
            return this.renderExpandedView();
        }

        return this.renderCollapsedView();
    }
}
