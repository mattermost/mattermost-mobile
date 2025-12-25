// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import {useEffect} from 'react';
import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getModalHeaderOptions} from '@hooks/navigation_header';
import JoinTeamScreen from '@screens/join_team';
import {navigateBack} from '@utils/navigation/adapter';

export default function JoinTeamRoute() {
    const navigation = useNavigation();
    const theme = useTheme();
    const intl = useIntl();

    useEffect(() => {
        navigation.setOptions({
            headerShown: true,
            headerTitle: intl.formatMessage({id: 'mobile.add_team.join_team', defaultMessage: 'Join Another Team'}),
            ...getModalHeaderOptions(theme, navigateBack, 'close.join_team.button'),
        });
    }, [intl, navigation, theme]);

    return <JoinTeamScreen/>;
}
