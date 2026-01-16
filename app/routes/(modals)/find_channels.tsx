// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import {useEffect} from 'react';
import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getModalHeaderOptions} from '@hooks/navigation_header';
import FindChannelsScreen from '@screens/find_channels';
import {navigateBack} from '@screens/navigation';

export default function FindChannelsRoute() {
    const navigation = useNavigation();
    const theme = useTheme();
    const intl = useIntl();

    useEffect(() => {
        navigation.setOptions({
            headerShown: true,
            headerTitle: intl.formatMessage({id: 'find_channels.title', defaultMessage: 'Find Channels'}),
            ...getModalHeaderOptions(theme, navigateBack, 'close.find_channels.button'),
        });
    }, [intl, navigation, theme]);

    return <FindChannelsScreen/>;
}
