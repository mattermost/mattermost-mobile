// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo, useState} from 'react';

import {Theme} from '@mm-redux/types/preferences';
import ChannelInfoRow from '@screens/channel_info/channel_info_row';
import {t} from '@utils/i18n';
import {preventDoubleTap} from '@utils/tap';

interface FavoriteProps {
    testID?: string;
    channelId: string;
    favoriteChannel: (channelId: string) => void;
    isFavorite: boolean;
    unfavoriteChannel: (channelId: string) => void;
    theme: Theme;
}

const Favorite = ({channelId, favoriteChannel, isFavorite, unfavoriteChannel, testID, theme}: FavoriteProps) => {
    const [favorite, setFavorite] = useState(isFavorite);

    const handleFavorite = preventDoubleTap(() => {
        const toggleFavorite = favorite ? unfavoriteChannel : favoriteChannel;
        setFavorite(!favorite);
        toggleFavorite(channelId);
    }, 500);

    return (
        <ChannelInfoRow
            testID={testID}
            action={handleFavorite}
            defaultMessage='Favorite'
            detail={favorite}
            icon='star-outline'
            textId={t('mobile.routes.channelInfo.favorite')}
            togglable={true}
            theme={theme}
        />
    );
};

export default memo(Favorite);
