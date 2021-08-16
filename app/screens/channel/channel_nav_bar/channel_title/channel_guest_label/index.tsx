// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {General} from '@constants';
import {t} from '@i18n';
import {makeStyleSheetFromTheme} from '@utils/theme';

type ChannelGuestLabelProps = {
    channelType: string;
    theme: Theme;
}

const ChannelGuestLabel = ({channelType, theme}: ChannelGuestLabelProps) => {
    const style = getStyle(theme);

    let messageId;
    let defaultMessage;

    switch (channelType) {
        case General.DM_CHANNEL: {
            messageId = t('channel.isGuest');
            defaultMessage = 'This person is a guest';
            break;
        }
        case General.GM_CHANNEL: {
            messageId = t('channel.hasGuests');
            defaultMessage = 'This group message has guests';
            break;
        }
        default : {
            messageId = t('channel.channelHasGuests');
            defaultMessage = 'This channel has guests';
            break;
        }
    }

    return (
        <View style={style.guestsWrapper}>
            <FormattedText
                numberOfLines={1}
                ellipsizeMode='tail'
                id={messageId}
                defaultMessage={defaultMessage}
                style={style.guestsText}
            />
        </View>
    );
};

const getStyle = makeStyleSheetFromTheme((theme) => {
    return {
        guestsWrapper: {
            alignItems: 'flex-start',
            flex: 1,
            position: 'relative',
            top: -1,
            width: '90%',
        },
        guestsText: {
            color: theme.sidebarHeaderTextColor,
            fontSize: 14,
            opacity: 0.6,
        },
    };
});

export default ChannelGuestLabel;
