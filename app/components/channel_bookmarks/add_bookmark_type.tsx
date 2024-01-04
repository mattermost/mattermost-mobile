// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';

import CompassIcon from '@components/compass_icon';
import OptionItem from '@components/option_item';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {dismissBottomSheet, showModal} from '@screens/navigation';

type Props = {
    channelId: string;
    type: ChannelBookmarkType;
    ownerId: string;
}

const AddBookmarkType = ({channelId, type, ownerId}: Props) => {
    const {formatMessage} = useIntl();
    const theme = useTheme();

    const onPress = useCallback(async () => {
        await dismissBottomSheet();
        const title = formatMessage({id: 'screens.channel_bookmark_add', defaultMessage: 'Add a bookmark'});
        const closeButton = CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor);
        const closeButtonId = 'close-channel-bookmark-add';

        const options = {
            topBar: {
                leftButtons: [{
                    id: closeButtonId,
                    icon: closeButton,
                    testID: 'close.channel_bookmark_add.button',
                }],
            },
        };
        showModal(Screens.CHANNEL_BOOKMARK_ADD, title, {channelId, closeButtonId, type, ownerId}, options);
    }, [channelId, theme, type, ownerId]);

    const label = useMemo(() => {
        if (type === 'link') {
            return formatMessage({id: 'channel_info.add_bookmark.link', defaultMessage: 'Add a link'});
        }

        return formatMessage({id: 'channel_info.add_bookmark.file', defaultMessage: 'Attach a file'});
    }, [type]);

    const icon = useMemo(() => {
        return type === 'link' ? 'link-variant' : 'paperclip';
    }, [type]);

    return (
        <OptionItem
            action={onPress}
            label={label}
            icon={icon}
            type='default'
        />
    );
};

export default AddBookmarkType;
