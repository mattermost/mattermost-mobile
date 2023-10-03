// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useMemo} from 'react';
import {defineMessages} from 'react-intl';
import {Text, View, type TextStyle} from 'react-native';

import {fetchProfilesInChannel} from '@actions/remote/user';
import FormattedText from '@components/formatted_text';
import {BotTag} from '@components/tag';
import {General, NotificationLevel} from '@constants';
import {useServerUrl} from '@context/server';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getUserIdFromChannelName} from '@utils/user';

import IntroOptions from '../options';

import Group from './group';
import Member from './member';

import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelMembershipModel from '@typings/database/models/servers/channel_membership';

type Props = {
    channel: ChannelModel;
    currentUserId: string;
    isBot: boolean;
    members?: ChannelMembershipModel[];
    theme: Theme;
    hasGMasDMFeature: boolean;
    channelNotifyProps?: Partial<ChannelNotifyProps>;
    userNotifyProps?: Partial<UserNotifyProps> | null;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    botContainer: {
        alignSelf: 'flex-end',
        bottom: 7.5,
        height: 20,
        marginBottom: 0,
        marginLeft: 4,
        paddingVertical: 0,
    },
    botText: {
        fontSize: 14,
        lineHeight: 20,
    },
    container: {
        alignItems: 'center',
        marginHorizontal: 20,
    },
    message: {
        color: theme.centerChannelColor,
        marginTop: 8,
        textAlign: 'center',
        ...typography('Body', 200, 'Regular'),
    },
    boldText: {
        ...typography('Body', 200, 'SemiBold'),
    },
    profilesContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        color: theme.centerChannelColor,
        marginTop: 4,
        textAlign: 'center',
        ...typography('Heading', 700, 'SemiBold'),
    },
    titleGroup: {
        ...typography('Heading', 600, 'SemiBold'),
    },
}));

const gmIntroMessages = defineMessages({
    muted: {id: 'intro.group_message.muted', defaultMessage: 'This group message is currently <b>muted</b>, so you will not be notified.'},
    [NotificationLevel.ALL]: {id: 'intro.group_message.all', defaultMessage: 'You\'ll be notified <b>for all activity</b> in this group message.'},
    [NotificationLevel.DEFAULT]: {id: 'intro.group_message.all', defaultMessage: 'You\'ll be notified <b>for all activity</b> in this group message.'},
    [NotificationLevel.MENTION]: {id: 'intro.group_message.mention', defaultMessage: 'You have selected to be notified <b>only when mentioned</b> in this group message.'},
    [NotificationLevel.NONE]: {id: 'intro.group_message.none', defaultMessage: 'You have selected to <b>never</b> be notified in this group message.'},
});

const getGMIntroMessageSpecificPart = (userNotifyProps: Partial<UserNotifyProps> | undefined | null, channelNotifyProps: Partial<ChannelNotifyProps> | undefined, boldStyle: TextStyle) => {
    const isMuted = channelNotifyProps?.mark_unread === 'mention';
    if (isMuted) {
        return (
            <FormattedText
                {...gmIntroMessages.muted}
                values={{
                    b: (chunk: string) => <Text style={boldStyle}>{chunk}</Text>,
                }}
            />
        );
    }
    const channelNotifyProp = channelNotifyProps?.push || NotificationLevel.DEFAULT;
    const userNotifyProp = userNotifyProps?.push || NotificationLevel.MENTION;
    let notifyLevelToUse = channelNotifyProp;
    if (notifyLevelToUse === NotificationLevel.DEFAULT) {
        notifyLevelToUse = userNotifyProp;
    }
    if (channelNotifyProp === NotificationLevel.DEFAULT && userNotifyProp === NotificationLevel.MENTION) {
        notifyLevelToUse = NotificationLevel.ALL;
    }

    return (
        <FormattedText
            {...gmIntroMessages[notifyLevelToUse]}
            values={{
                b: (chunk: string) => <Text style={boldStyle}>{chunk}</Text>,
            }}
        />
    );
};

const DirectChannel = ({
    channel,
    currentUserId,
    isBot,
    members,
    theme,
    hasGMasDMFeature,
    channelNotifyProps,
    userNotifyProps,
}: Props) => {
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    useEffect(() => {
        const channelMembers = members?.filter((m) => m.userId !== currentUserId);
        if (!channelMembers?.length) {
            fetchProfilesInChannel(serverUrl, channel.id, currentUserId, undefined, false);
        }
    }, []);

    const message = useMemo(() => {
        if (channel.type === General.DM_CHANNEL) {
            return (
                <FormattedText
                    defaultMessage={'This is the start of your conversation with {teammate}. Messages and files shared here are not shown to anyone else.'}
                    id='intro.direct_message'
                    style={styles.message}
                    values={{teammate: channel.displayName}}
                />
            );
        }
        if (!hasGMasDMFeature) {
            return (
                <FormattedText
                    defaultMessage={'This is the start of your conversation with this group. Messages and files shared here are not shown to anyone else outside of the group.'}
                    id='intro.group_message.after_gm_as_dm'
                    style={styles.message}
                />
            );
        }
        return (
            <Text style={styles.message}>
                <FormattedText
                    defaultMessage={'This is the start of your conversation with this group.'}
                    id='intro.group_message.common'
                />
                <Text> </Text>
                {getGMIntroMessageSpecificPart(userNotifyProps, channelNotifyProps, styles.boldText)}
            </Text>
        );
    }, [channel.displayName, theme, channelNotifyProps, userNotifyProps]);

    const profiles = useMemo(() => {
        if (channel.type === General.DM_CHANNEL) {
            const teammateId = getUserIdFromChannelName(currentUserId, channel.name);
            const teammate = members?.find((m) => m.userId === teammateId);
            if (!teammate) {
                return null;
            }

            return (
                <Member
                    channelId={channel.id}
                    containerStyle={{height: 96}}
                    member={teammate}
                    size={96}
                    theme={theme}
                />
            );
        }

        const channelMembers = members?.filter((m) => m.userId !== currentUserId);
        if (!channelMembers?.length) {
            return null;
        }
        return (
            <Group
                theme={theme}
                userIds={channelMembers.map((cm) => cm.userId)}
            />
        );
    }, [members, theme]);

    return (
        <View style={styles.container}>
            <View style={styles.profilesContainer}>
                {profiles}
            </View>
            <View style={{flexDirection: 'row'}}>
                <Text
                    style={[styles.title, channel.type === General.GM_CHANNEL ? styles.titleGroup : undefined]}
                    testID='channel_post_list.intro.display_name'
                >
                    {channel.displayName}
                </Text>
                {isBot &&
                <BotTag
                    style={styles.botContainer}
                    textStyle={styles.botText}
                />
                }
            </View>
            {message}
            <IntroOptions
                channelId={channel.id}
                header={true}
                favorite={true}
                canAddMembers={false}
            />
        </View>
    );
};

export default DirectChannel;
