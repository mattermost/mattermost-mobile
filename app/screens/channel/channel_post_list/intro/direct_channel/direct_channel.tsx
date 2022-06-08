// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useMemo} from 'react';
import {Text, View} from 'react-native';

import {fetchProfilesInChannel} from '@actions/remote/user';
import FormattedText from '@components/formatted_text';
import {BotTag} from '@components/tag';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

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

const DirectChannel = ({channel, currentUserId, isBot, members, theme}: Props) => {
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    useEffect(() => {
        const channelMembers = members?.filter((m) => m.userId !== currentUserId);
        if (!channelMembers?.length) {
            fetchProfilesInChannel(serverUrl, channel.id, currentUserId, false);
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
        return (
            <FormattedText
                defaultMessage={'This is the start of your conversation with this group. Messages and files shared here are not shown to anyone else outside of the group.'}
                id='intro.group_message'
                style={styles.message}
            />
        );
    }, [channel.displayName, theme]);

    const profiles = useMemo(() => {
        const channelMembers = members?.filter((m) => m.userId !== currentUserId);
        if (!channelMembers?.length) {
            return null;
        }

        if (channel.type === General.DM_CHANNEL) {
            return (
                <Member
                    channelId={channel.id}
                    containerStyle={{height: 96}}
                    member={channelMembers[0]}
                    size={96}
                    theme={theme}
                />
            );
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
                people={false}
            />
        </View>
    );
};

export default DirectChannel;
