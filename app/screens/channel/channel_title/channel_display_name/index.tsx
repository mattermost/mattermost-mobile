// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text} from 'react-native';

import FormattedText from '@components/formatted_text';
import {General} from '@constants';
import {t} from '@utils/i18n';
import {makeStyleSheetFromTheme} from '@utils/theme';

type ChannelDisplayNameProps = {
    channelType: string;
    currentUserId: string;
    displayName: string;
    teammateId: string;
    theme: Theme;
};

const ChannelDisplayName = ({channelType, currentUserId, displayName, teammateId, theme}: ChannelDisplayNameProps) => {
    const style = getStyle(theme);
    let isSelfDMChannel = false;
    if (channelType === General.DM_CHANNEL && teammateId) {
        isSelfDMChannel = currentUserId === teammateId;
    }

    if (isSelfDMChannel) {
        const messageId = t('channel_header.directchannel.you');
        const defaultMessage = '{displayname} (you)';
        const values = {displayname: displayName};

        return (
            <FormattedText
                id={messageId}
                defaultMessage={defaultMessage}
                values={values}
            />
        );
    }

    return (
        <Text
            ellipsizeMode='tail'
            numberOfLines={1}
            style={style.text}
            testID='channel.nav_bar.title'
        >
            {displayName}
        </Text>
    );
};

const getStyle = makeStyleSheetFromTheme((theme) => {
    return {
        text: {
            color: theme.sidebarHeaderTextColor,
            fontSize: 18,
            fontWeight: 'bold',
            textAlign: 'center',
            flex: 0,
            flexShrink: 1,
        },
    };
});

export default ChannelDisplayName;
