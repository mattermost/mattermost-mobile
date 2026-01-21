// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import React from 'react';
import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {useNavigationHeader, getModalHeaderOptions, getHeaderOptions} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import CustomStatusAfterClearScreen, {type CustomStatusClearAfterProps} from '@screens/custom_status_clear_after';

export default function MfaScreen() {
    const {isModal, ...props} = usePropsFromParams<CustomStatusClearAfterProps & {isModal?: boolean}>();
    const navigation = useNavigation();
    const intl = useIntl();
    const theme = useTheme();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'mobile.custom_status.clear_after.title', defaultMessage: 'Clear Custom Status After'}),
            ...(isModal ? getModalHeaderOptions(theme, navigation.goBack, 'close.browse_channels.button') : getHeaderOptions(theme)),
        },
    });

    return <CustomStatusAfterClearScreen {...props}/>;
}
