// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import {saveFavoriteChannel} from '@actions/remote/preference';
import {useServerUrl} from '@context/server';

import OptionItem from '../item';

type Props = {
    channelId: string;
    isFavorite: boolean;
    theme: Theme;
}

const IntroFavorite = ({channelId, isFavorite, theme}: Props) => {
    const {formatMessage} = useIntl();
    const serverUrl = useServerUrl();

    const toggleFavorite = useCallback(() => {
        saveFavoriteChannel(serverUrl, channelId, !isFavorite);
    }, [channelId, isFavorite]);

    return (
        <OptionItem
            applyMargin={true}
            color={isFavorite ? theme.buttonBg : undefined}
            iconName={isFavorite ? 'star' : 'star-outline'}
            label={formatMessage({id: 'intro.favorite', defaultMessage: 'Favorite'})}
            onPress={toggleFavorite}
            theme={theme}
        />
    );
};

export default IntroFavorite;
