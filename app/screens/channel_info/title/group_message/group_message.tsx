// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Text} from 'react-native';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import GroupAvatars from './avatars';

import type ChannelMembershipModel from '@typings/database/models/servers/channel_membership';

type Props = {
    currentUserId: string;
    displayName?: string;
    members: ChannelMembershipModel[];
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    avatars: {
        left: 0,
        marginBottom: 8,
    },
    title: {
        color: theme.centerChannelColor,
        ...typography('Heading', 600, 'SemiBold'),
    },
}));

const GroupMessage = ({currentUserId, displayName, members}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const userIds = useMemo(() => members.map((cm) => cm.userId).filter((id) => id !== currentUserId),
        [members.length, currentUserId]);

    return (
        <>
            <GroupAvatars
                userIds={userIds}
            />
            <Text
                style={styles.title}
                testID='channel_info.title.group_message.display_name'
            >
                {displayName}
            </Text>
        </>
    );
};

export default GroupMessage;
