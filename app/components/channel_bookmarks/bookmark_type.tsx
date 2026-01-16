// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import OptionItem from '@components/option_item';
import {Screens} from '@constants';
import {dismissBottomSheet, navigateToScreen} from '@screens/navigation';

type Props = {
    channelId: string;
    type: ChannelBookmarkType;
    ownerId: string;
}

const BookmarkType = ({channelId, type, ownerId}: Props) => {
    const {formatMessage} = useIntl();

    const onPress = useCallback(async () => {
        await dismissBottomSheet();

        navigateToScreen(Screens.CHANNEL_BOOKMARK, {channelId, type, ownerId});
    }, [channelId, type, ownerId]);

    let icon;
    let label;
    if (type === 'link') {
        icon = 'link-variant';
        label = formatMessage({id: 'channel_info.add_bookmark.link', defaultMessage: 'Add a link'});
    } else {
        icon = 'paperclip';
        label = formatMessage({id: 'channel_info.add_bookmark.file', defaultMessage: 'Attach a file'});
    }

    return (
        <OptionItem
            action={onPress}
            label={label}
            icon={icon}
            type='default'
        />
    );
};

export default BookmarkType;
