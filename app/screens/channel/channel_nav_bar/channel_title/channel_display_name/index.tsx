// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text} from 'react-native';

import FormattedText from '@components/formatted_text';
import {General} from '@constants';
import {makeStyleSheetFromTheme} from '@utils/theme';

type ChannelDisplayNameProps = {
    channelType: string;
    currentUserId: string;
    displayName: string;
    teammateId?: string;
    theme: Theme;
};

const ChannelDisplayName = ({channelType, currentUserId, displayName, teammateId, theme}: ChannelDisplayNameProps) => {
    const style = getStyle(theme);
    let isSelfDMChannel = false;
    if (channelType === General.DM_CHANNEL && teammateId) {
        isSelfDMChannel = currentUserId === teammateId;
    }

    return (
        <Text
            ellipsizeMode='tail'
            numberOfLines={1}
            style={style.text}
            testID='channel.nav_bar.title'
        >
            {isSelfDMChannel ? (
                <FormattedText
                    id={'channel_header.directchannel.you'}
                    defaultMessage={'{displayname} (you)'}
                    values={{displayname: displayName}}
                />) : displayName
            }
        </Text>
    );
};

const getStyle = makeStyleSheetFromTheme((theme) => {
    return {
        text: {
            color: theme.sidebarHeaderTextColor,
            fontSize: 18,
            fontFamily: 'OpenSans-Semibold',
            textAlign: 'center',
            flex: 0,
            flexShrink: 1,
        },
    };
});

export default ChannelDisplayName;
