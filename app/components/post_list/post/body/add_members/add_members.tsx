// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ReactNode} from 'react';
import {useIntl} from 'react-intl';
import {Text} from 'react-native';

import {removePost, sendAddToChannelEphemeralPost} from '@actions/local/post';
import {addMembersToChannel} from '@actions/remote/channel';
import FormattedText from '@components/formatted_text';
import AtMention from '@components/markdown/at_mention';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {getMarkdownTextStyles} from '@utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {isStringArray} from '@utils/types';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';

type AddMembersProps = {
    channelType: string | null;
    currentUser?: UserModel;
    location: string;
    post: PostModel;
    theme: Theme;
}

export type AddMemberPostProps = {
    post_id: string;
    not_in_channel_user_ids?: string[];
    not_in_groups_usernames?: string[];
    not_in_channel_usernames?: string[];
    user_ids?: string[];
    usernames?: string[];
}

export function isAddMemberProps(v: unknown): v is AddMemberPostProps {
    if (typeof v !== 'object' || !v) {
        return false;
    }

    if (!('post_id' in v) || typeof v.post_id !== 'string') {
        return false;
    }

    if (('not_in_channel_user_ids' in v) && !isStringArray(v.not_in_channel_user_ids)) {
        return false;
    }

    if (('not_in_groups_usernames' in v) && !isStringArray(v.not_in_groups_usernames)) {
        return false;
    }

    if (('not_in_channel_usernames' in v) && !isStringArray(v.not_in_channel_usernames)) {
        return false;
    }

    return true;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        message: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
            fontSize: 16,
            lineHeight: 20,
        },
    };
});

const AddMembers = ({channelType, currentUser, location, post, theme}: AddMembersProps) => {
    const intl = useIntl();
    const styles = getStyleSheet(theme);
    const textStyles = getMarkdownTextStyles(theme);
    const serverUrl = useServerUrl();
    if (!isAddMemberProps(post.props?.add_channel_member)) {
        return null;
    }

    const postId = post.props.add_channel_member.post_id;
    const noGroupsUsernames = post.props.add_channel_member.not_in_groups_usernames || [];
    const userIds = post.props.add_channel_member.not_in_channel_user_ids || post.props.add_channel_member.user_ids || [];
    const usernames = post.props.add_channel_member.not_in_channel_usernames || post.props.add_channel_member?.usernames || [];

    if (!postId || !channelType) {
        return null;
    }

    const handleAddChannelMember = () => {
        if (post && post.channelId && currentUser) {
            addMembersToChannel(serverUrl, post.channelId, userIds, post.rootId, false);
            if (post.rootId) {
                const messages = usernames.map((addedUsername) => {
                    return intl.formatMessage(
                        {
                            id: 'api.channel.add_member.added',
                            defaultMessage: '{addedUsername} added to the channel by {username}.',
                        },
                        {
                            username: currentUser.username,
                            addedUsername,
                        },
                    );
                });
                sendAddToChannelEphemeralPost(serverUrl, currentUser, usernames, messages, post.channelId, post.rootId);
            }

            removePost(serverUrl, post);
        }
    };

    const generateAtMentions = (names: string[]) => {
        if (names.length === 1) {
            return (
                <AtMention
                    channelId={post.channelId}
                    location={location}
                    mentionName={names[0]}
                    mentionStyle={textStyles.mention}
                />
            );
        } else if (names.length > 1) {
            function andSeparator(key: string) {
                return (
                    <FormattedText
                        key={key}
                        id={'post_body.check_for_out_of_channel_mentions.link.and'}
                        defaultMessage={' and '}
                    />
                );
            }

            function commaSeparator(key: string) {
                return <Text key={key}>{', '}</Text>;
            }

            return (
                <Text>
                    {
                        names.map((username: string) => {
                            return (
                                <AtMention
                                    key={username}
                                    channelId={post.channelId}
                                    location={location}
                                    mentionStyle={textStyles.mention}
                                    mentionName={username}
                                />
                            );
                        }).reduce((acc: ReactNode[], el: ReactNode, idx: number, arr: ReactNode[]) => {
                            if (idx === 0) {
                                return [el];
                            } else if (idx === arr.length - 1) {
                                return [...acc, andSeparator(`separator-${idx}`), el];
                            }

                            return [...acc, commaSeparator(`commma-separator-${idx}`), el];
                        }, [])
                    }
                </Text>
            );
        }

        return '';
    };

    let linkId = '';
    let linkText = '';
    if (channelType === General.PRIVATE_CHANNEL) {
        linkId = t('post_body.check_for_out_of_channel_mentions.link.private');
        linkText = 'add them to this private channel';
    } else if (channelType === General.OPEN_CHANNEL) {
        linkId = t('post_body.check_for_out_of_channel_mentions.link.public');
        linkText = 'add them to the channel';
    }

    let outOfChannelMessageID = '';
    let outOfChannelMessageText = '';
    const outOfChannelAtMentions = generateAtMentions(usernames);
    if (usernames.length === 1) {
        outOfChannelMessageID = t('post_body.check_for_out_of_channel_mentions.message.one');
        outOfChannelMessageText = 'was mentioned but is not in the channel. Would you like to ';
    } else if (usernames.length > 1) {
        outOfChannelMessageID = t('post_body.check_for_out_of_channel_mentions.message.multiple');
        outOfChannelMessageText = 'were mentioned but they are not in the channel. Would you like to ';
    }

    let outOfGroupsMessageID = '';
    let outOfGroupsMessageText = '';
    const outOfGroupsAtMentions = generateAtMentions(noGroupsUsernames);
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
                    style={styles.message}
                />
                <Text
                    style={textStyles.link}
                    testID='add_channel_member_link'
                    onPress={handleAddChannelMember}
                >
                    <FormattedText
                        id={linkId}
                        defaultMessage={linkText}
                    />
                </Text>
                <FormattedText
                    id={'post_body.check_for_out_of_channel_mentions.message_last'}
                    defaultMessage={'? They will have access to all message history.'}
                    style={styles.message}
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
                    style={styles.message}
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
};

export default AddMembers;
