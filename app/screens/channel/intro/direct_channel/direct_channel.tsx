// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useMemo} from 'react';
import {View} from 'react-native';

import {fetchProfilesInChannel} from '@actions/remote/user';
import FormattedText from '@components/formatted_text';
import {General} from '@constants';
import {useServerUrl} from '@context/server_url';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Member from './member';

import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelMembershipModel from '@typings/database/models/servers/channel_membership';

type Props = {
    channel: ChannelModel;
    currentUserId: string;
    members?: ChannelMembershipModel[];
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    message: {
        color: changeOpacity(theme.centerChannelColor, 0.8),
        ...typography('Body', 100, 'Regular'),
    },
    profilesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
}));

const DirectChannel = ({channel, currentUserId, members, theme}: Props) => {
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
                    defaultMessage={'This is the start of your direct message history with {teammate}.\nDirect messages and files shared here are not shown to people outside this area.'}
                    id='mobile.intro_messages.DM'
                    style={styles.message}
                    values={{teammate: channel.displayName}}
                />
            );
        }
        return (
            <FormattedText
                defaultMessage={'This is the start of your group message history with {teammates}.\nMessages and files shared here are not shown to people outside this area.'}
                id='intro_messages.group_message'
                style={styles.message}
                values={{teammates: channel.displayName}}
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
                    member={channelMembers[0]}
                    theme={theme}
                />
            );
        }

        return channelMembers?.map((cm) => (
            <Member
                key={cm.userId}
                member={cm}
                theme={theme}
            />
        ));
    }, [members, theme]);

    return (
        <View>
            <View style={styles.profilesContainer}>
                {profiles}
            </View>
            {message}
        </View>
    );
};

export default DirectChannel;
