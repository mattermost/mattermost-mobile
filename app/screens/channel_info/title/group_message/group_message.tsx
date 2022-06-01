// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text} from 'react-native';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import GroupAvatars from './avatars';

import type ChannelMembershipModel from '@typings/database/models/servers/channel_membership';

type Props = {
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

const GroupMessage = ({displayName, members}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <>
            <GroupAvatars
                userIds={members.map((cm) => cm.userId)}
            />
            <Text style={styles.title}>
                {displayName}
            </Text>
        </>
    );
};

export default GroupMessage;
