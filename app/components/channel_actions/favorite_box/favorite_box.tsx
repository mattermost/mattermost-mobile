// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import {toggleFavoriteChannel} from '@actions/remote/category';
import OptionBox from '@components/option_box';
import {useServerUrl} from '@context/server';
import {dismissBottomSheet} from '@screens/navigation';

import type {StyleProp, ViewStyle} from 'react-native';

type Props = {
    channelId: string;
    containerStyle?: StyleProp<ViewStyle>;
    isFavorited: boolean;
    showSnackBar?: boolean;
    testID?: string;
}

const FavoriteBox = ({channelId, containerStyle, isFavorited, showSnackBar = false, testID}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const handleOnPress = useCallback(async () => {
        await dismissBottomSheet();
        toggleFavoriteChannel(serverUrl, channelId, showSnackBar);
    }, [serverUrl, channelId, showSnackBar]);

    const favoriteActionTestId = isFavorited ? `${testID}.unfavorite.action` : `${testID}.favorite.action`;

    return (
        <OptionBox
            activeIconName='star'
            activeText={intl.formatMessage({id: 'channel_info.favorited', defaultMessage: 'Favorited'})}
            containerStyle={containerStyle}
            iconName='star-outline'
            isActive={isFavorited}
            onPress={handleOnPress}
            testID={favoriteActionTestId}
            text={intl.formatMessage({id: 'channel_info.favorite', defaultMessage: 'Favorite'})}
        />
    );
};

export default FavoriteBox;
