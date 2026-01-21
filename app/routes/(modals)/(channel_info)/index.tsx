// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useLocalSearchParams, useNavigation} from 'expo-router';

import {useTheme} from '@context/theme';
import {getModalHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import ChannelInfoScreen from '@screens/channel_info';

type ChannelInfoRouteProps = {
    title: string;
    channelId: string;
}

export default function ChannelInfoRoute() {
    const navigation = useNavigation();
    const {title, channelId} = useLocalSearchParams<ChannelInfoRouteProps>();
    const theme = useTheme();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: title,
            ...getModalHeaderOptions(theme, navigation.goBack, 'close.channel_info.button'),
        },
    });

    return <ChannelInfoScreen channelId={channelId}/>;
}
