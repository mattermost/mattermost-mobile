// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import {useIntl} from 'react-intl';

import NavigationButton from '@components/navigation_button';
import NavigationHeaderTitle from '@components/navigation_header_title';
import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import ChannelPinnedMessagesScreen from '@screens/pinned_messages';

type ChannelPinnedMessagesProps = {
    channelId: string;
    displayName?: string;
}

export default function ChannelPinnedMessagesRoute() {
    const theme = useTheme();
    const intl = useIntl();
    const navigation = useNavigation();
    const {channelId, displayName} = usePropsFromParams<ChannelPinnedMessagesProps>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: () => (
                <NavigationHeaderTitle
                    title={intl.formatMessage({id: 'channel_info.pinned_messages', defaultMessage: 'Pinned Messages'})}
                    subtitle={displayName}
                />
            ),
            headerLeft: () => (
                <NavigationButton
                    onPress={() => navigation.goBack()}
                    iconName='arrow-left'
                    iconSize={24}
                    testID='channel_info.pinned_messages.back'
                />
            ),
            ...getHeaderOptions(theme),
        },
    });

    return <ChannelPinnedMessagesScreen channelId={channelId}/>;
}
