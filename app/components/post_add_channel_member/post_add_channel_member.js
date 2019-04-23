// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {intlShape} from 'react-intl';

import {Text} from 'react-native';

import {General} from 'mattermost-redux/constants';

import {concatStyles} from 'app/utils/theme';
import {t} from 'app/utils/i18n';

import AtMention from 'app/components/at_mention';
import FormattedText from 'app/components/formatted_text';
import CustomPropTypes from 'app/constants/custom_prop_types';

export default class PostAddChannelMember extends React.PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            addChannelMember: PropTypes.func.isRequired,
            removePost: PropTypes.func.isRequired,
            sendAddToChannelEphemeralPost: PropTypes.func.isRequired,
        }).isRequired,
        baseTextStyle: CustomPropTypes.Style,
        currentUser: PropTypes.object.isRequired,
        channelType: PropTypes.string,
        post: PropTypes.object.isRequired,
        postId: PropTypes.string.isRequired,
        userIds: PropTypes.array.isRequired,
        usernames: PropTypes.array.isRequired,
        noGroupsUsernames: PropTypes.array,
        navigator: PropTypes.object.isRequired,
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

    generateAtMentions(usernames = [], textStyles) {
        if (usernames.length === 1) {
            return (
                <AtMention
                    mentionStyle={this.props.textStyles.mention}
                    mentionName={usernames[0]}
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
                        style={textStyles}
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
        const {channelType, baseTextStyle, postId, usernames, noGroupsUsernames} = this.props;

        if (!postId || !channelType) {
            return null;
        }

        let linkId;
        let linkText;
        if (channelType === General.PRIVATE_CHANNEL) {
            linkId = t('post_body.check_for_out_of_channel_mentions.link.private');
            linkText = 'add them to this private channel';
        } else if (channelType === General.OPEN_CHANNEL) {
            linkId = t('post_body.check_for_out_of_channel_mentions.link.public');
            linkText = 'add them to the channel';
        }

        let outOfChannelMessageID;
        let outOfChannelMessageText;
        const outOfChannelAtMentions = this.generateAtMentions(usernames, baseTextStyle);
        if (usernames.length === 1) {
            outOfChannelMessageID = t('post_body.check_for_out_of_channel_mentions.message.one');
            outOfChannelMessageText = 'was mentioned but is not in the channel. Would you like to ';
        } else if (usernames.length > 1) {
            outOfChannelMessageID = t('post_body.check_for_out_of_channel_mentions.message.multiple');
            outOfChannelMessageText = 'were mentioned but they are not in the channel. Would you like to ';
        }

        let outOfGroupsMessageID;
        let outOfGroupsMessageText;
        const outOfGroupsAtMentions = this.generateAtMentions(noGroupsUsernames, baseTextStyle);
        if (noGroupsUsernames?.length) {
            outOfGroupsMessageID = t('post_body.check_for_out_of_channel_groups_mentions.message');
            outOfGroupsMessageText = 'did not get notified by this mention because they are not in the channel. They are also not a member of the groups linked to this channel.';
        }

        let outOfChannelMessage = null;
        if (usernames.length) {
            outOfChannelMessage = (
                <Text>
                    {outOfChannelAtMentions}
                    {' '}
                    <FormattedText
                        id={outOfChannelMessageID}
                        defaultMessage={outOfChannelMessageText}
                        style={baseTextStyle}
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
                        style={baseTextStyle}
                    />
                </Text>
            );
        }

        let outOfGroupsMessage = null;
        if (noGroupsUsernames?.length) {
            outOfGroupsMessage = (
                <Text>
                    {outOfGroupsAtMentions}
                    {' '}
                    <FormattedText
                        id={outOfGroupsMessageID}
                        defaultMessage={outOfGroupsMessageText}
                        style={baseTextStyle}
                    />
                </Text>
            );
        }

        return (
            <>
                {outOfChannelMessage}
                {outOfGroupsMessage}
            </>
        );
    }
}
