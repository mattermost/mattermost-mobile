// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {ReactNode} from 'react';
import {useIntl} from 'react-intl';
import {Text} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {removePost, sendAddToChannelEphemeralPost} from '@actions/local/post';
import {addMembersToChannel} from '@actions/remote/channel';
import FormattedText from '@components/formatted_text';
import AtMention from '@components/markdown/at_mention';
import {General} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {getMarkdownTextStyles} from '@utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

type AddMembersProps = {
    channelType: string | null;
    currentUser: UserModel;
    post: PostModel;
    theme: Theme;
}

const {SERVER: {SYSTEM, USER}} = MM_TABLES;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        message: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
            fontSize: 16,
            lineHeight: 20,
        },
    };
});

const AddMembers = ({channelType, currentUser, post, theme}: AddMembersProps) => {
    const intl = useIntl();
    const styles = getStyleSheet(theme);
    const textStyles = getMarkdownTextStyles(theme);
    const serverUrl = useServerUrl();
    const postId: string = post.props.add_channel_member?.post_id;
    const noGroupsUsernames = post.props.add_channel_member?.not_in_groups_usernames;
    let userIds: string[] = post.props.add_channel_member?.not_in_channel_user_ids;
    let usernames: string[] = post.props.add_channel_member?.not_in_channel_usernames;

    if (!postId || !channelType) {
        return null;
    }

    if (!userIds) {
        userIds = post.props.add_channel_member?.user_ids;
    }
    if (!usernames) {
        usernames = post.props.add_channel_member?.usernames;
    }

    const handleAddChannelMember = () => {
        if (post && post.channelId) {
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
                        style={textStyles}
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
                <TouchableOpacity onPress={handleAddChannelMember}>
                    <FormattedText
                        id={linkId}
                        defaultMessage={linkText}
                        style={textStyles.link}
                        testID='add_channel_member_link'
                    />
                </TouchableOpacity>
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

const withChannelType = withObservables(['post'], ({database, post}: WithDatabaseArgs & {post: PostModel}) => ({
    currentUser: database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        switchMap(({value}) => database.get(USER).findAndObserve(value)),
    ),
    channelType: post.channel.observe().pipe(
        switchMap(
            (channel: ChannelModel) => (channel ? of$(channel.type) : of$(null)),
        ),
    ),
}));

export default withDatabase(withChannelType(AddMembers));
