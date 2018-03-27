// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {intlShape} from 'react-intl';

import {Text} from 'react-native';

import {General} from 'mattermost-redux/constants';

import {concatStyles} from 'app/utils/theme';

import AtMention from 'app/components/at_mention';
import FormattedText from 'app/components/formatted_text';

export default class PostAddChannelMember extends React.PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            addChannelMember: PropTypes.func.isRequired,
            removePost: PropTypes.func.isRequired,
            sendAddToChannelEphemeralPost: PropTypes.func.isRequired,
        }).isRequired,
        currentUser: PropTypes.object.isRequired,
        channelType: PropTypes.string,
        post: PropTypes.object.isRequired,
        postId: PropTypes.string.isRequired,
        userIds: PropTypes.array.isRequired,
        usernames: PropTypes.array.isRequired,
        navigator: PropTypes.object.isRequired,
        onLongPress: PropTypes.func,
        onPostPress: PropTypes.func,
        textStyles: PropTypes.object,
    };

    static contextTypes = {
        intl: intlShape,
    };

    computeTextStyle = (baseStyle, context) => {
        return concatStyles(baseStyle, context.map((type) => this.props.textStyles[type]));
    }

    handleAddChannelMember = () => {
        const {
            actions,
            currentUser,
            post,
            userIds,
            usernames,
        } = this.props;

        const {formatMessage} = this.context.intl;

        if (post && post.channel_id) {
            userIds.forEach((userId, index) => {
                actions.addChannelMember(post.channel_id, userId);

                if (post.root_id) {
                    const message = formatMessage(
                        {
                            id: 'api.channel.add_member.added',
                            defaultMessage: '{addedUsername} added to the channel by {username}.',
                        },
                        {
                            username: currentUser.username,
                            addedUsername: usernames[index],
                        }
                    );

                    actions.sendAddToChannelEphemeralPost(currentUser, usernames[index], message, post.channel_id, post.root_id);
                }
            });

            actions.removePost(post);
        }
    }

    generateAtMentions(usernames = []) {
        if (usernames.length === 1) {
            return (
                <AtMention
                    mentionStyle={this.props.textStyles.mention}
                    mentionName={usernames[0]}
                    onLongPress={this.props.onLongPress}
                    onPostPress={this.props.onPostPress}
                    navigator={this.props.navigator}
                />
            );
        } else if (usernames.length > 1) {
            function andSeparator(key) {
                return (
                    <FormattedText
                        key={key}
                        id={'post_body.check_for_out_of_channel_mentions.link.and'}
                        defaultMessage={' and '}
                    />
                );
            }

            function commaSeparator(key) {
                return <Text key={key}>{', '}</Text>;
            }

            return (
                <Text>
                    {
                        usernames.map((username) => {
                            return (
                                <AtMention
                                    key={username}
                                    mentionStyle={this.props.textStyles.mention}
                                    mentionName={username}
                                    onLongPress={this.props.onLongPress}
                                    onPostPress={this.props.onPostPress}
                                    navigator={this.props.navigator}
                                />
                            );
                        }).reduce((acc, el, idx, arr) => {
                            if (idx === 0) {
                                return [el];
                            } else if (idx === arr.length - 1) {
                                return [...acc, andSeparator(idx), el];
                            }

                            return [...acc, commaSeparator(idx), el];
                        }, [])
                    }
                </Text>
            );
        }

        return '';
    }

    render() {
        const {channelType, postId, usernames} = this.props;
        if (!postId || !channelType) {
            return null;
        }

        let linkId;
        let linkText;
        if (channelType === General.PRIVATE_CHANNEL) {
            linkId = 'post_body.check_for_out_of_channel_mentions.link.private';
            linkText = 'add them to this private channel';
        } else if (channelType === General.OPEN_CHANNEL) {
            linkId = 'post_body.check_for_out_of_channel_mentions.link.public';
            linkText = 'add them to the channel';
        }

        let messageId;
        let messageText;
        if (usernames.length === 1) {
            messageId = 'post_body.check_for_out_of_channel_mentions.message.one';
            messageText = 'was mentioned but is not in the channel. Would you like to ';
        } else if (usernames.length > 1) {
            messageId = 'post_body.check_for_out_of_channel_mentions.message.multiple';
            messageText = 'were mentioned but they are not in the channel. Would you like to ';
        }

        const atMentions = this.generateAtMentions(usernames);

        return (
            <Text>
                {atMentions}
                {' '}
                <FormattedText
                    id={messageId}
                    defaultMessage={messageText}
                />
                <Text
                    style={this.props.textStyles.link}
                    id='add_channel_member_link'
                    onPress={this.handleAddChannelMember}
                >
                    <FormattedText
                        id={linkId}
                        defaultMessage={linkText}
                    />
                </Text>
                <FormattedText
                    id={'post_body.check_for_out_of_channel_mentions.message_last'}
                    defaultMessage={'? They will have access to all message history.'}
                />
            </Text>
        );
    }
}
