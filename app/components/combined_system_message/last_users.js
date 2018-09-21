// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {Text} from 'react-native';
import {intlShape} from 'react-intl';

import {Posts} from 'mattermost-redux/constants';

import FormattedMarkdownText from 'app/components/formatted_markdown_text';
import FormattedText from 'app/components/formatted_text';
import Markdown from 'app/components/markdown';

import {t} from 'app/utils/i18n';

const typeMessage = {
    [Posts.POST_TYPES.ADD_TO_CHANNEL]: {
        id: t('last_users_message.added_to_channel.type'),
        defaultMessage: 'were **added to the channel** by {actor}.',
    },
    [Posts.POST_TYPES.JOIN_CHANNEL]: {
        id: t('last_users_message.joined_channel.type'),
        defaultMessage: '**joined the channel**.',
    },
    [Posts.POST_TYPES.LEAVE_CHANNEL]: {
        id: t('last_users_message.left_channel.type'),
        defaultMessage: '**left the channel**.',
    },
    [Posts.POST_TYPES.REMOVE_FROM_CHANNEL]: {
        id: t('last_users_message.removed_from_channel.type'),
        defaultMessage: 'were **removed from the channel**.',
    },
    [Posts.POST_TYPES.ADD_TO_TEAM]: {
        id: t('last_users_message.added_to_team.type'),
        defaultMessage: 'were **added to the team** by {actor}.',
    },
    [Posts.POST_TYPES.JOIN_TEAM]: {
        id: t('last_users_message.joined_team.type'),
        defaultMessage: '**joined the team**.',
    },
    [Posts.POST_TYPES.LEAVE_TEAM]: {
        id: t('last_users_message.left_team.type'),
        defaultMessage: '**left the team**.',
    },
    [Posts.POST_TYPES.REMOVE_FROM_TEAM]: {
        id: t('last_users_message.removed_from_team.type'),
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
        theme: PropTypes.object.isRequired,
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
            navigator,
            style,
            textStyles,
            usernames,
        } = this.props;

        const lastIndex = usernames.length - 1;
        const lastUser = usernames[lastIndex];

        const formattedMessage = formatMessage(expandedLocale, {
            users: usernames.slice(0, lastIndex).join(', '),
            lastUser,
            actor,
        });

        return (
            <Markdown
                baseTextStyle={style.baseText}
                navigator={navigator}
                textStyles={textStyles}
                value={formattedMessage}
            />
        );
    }

    renderCollapsedView = () => {
        const {
            actor,
            navigator,
            postType,
            style,
            textStyles,
            theme,
            usernames,
        } = this.props;

        const firstUser = usernames[0];
        const numOthers = usernames.length - 1;

        return (
            <Text>
                <FormattedMarkdownText
                    id={'last_users_message.first'}
                    defaultMessage={'{firstUser} and '}
                    values={{firstUser}}
                    baseTextStyle={style.baseText}
                    navigator={navigator}
                    style={style.baseText}
                    textStyles={textStyles}
                    theme={theme}
                />
                <Text>{' '}</Text>
                <Text
                    style={style.linkText}
                    onPress={this.handleOnPress}
                >
                    <FormattedText
                        id={'last_users_message.others'}
                        defaultMessage={'{numOthers} others '}
                        values={{numOthers}}
                    />
                </Text>
                <FormattedMarkdownText
                    id={typeMessage[postType].id}
                    defaultMessage={typeMessage[postType].defaultMessage}
                    values={{actor}}
                    baseTextStyle={style.baseText}
                    navigator={navigator}
                    style={style.baseText}
                    textStyles={textStyles}
                    theme={theme}
                />
            </Text>
        );
    }

    render() {
        if (this.state.expand) {
            return this.renderExpandedView();
        }

        return this.renderCollapsedView();
    }
}
