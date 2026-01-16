// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {useThemeByAppearanceWithDefault} from '@context/theme';
import {useNavigationHeader, getLoginFlowHeaderOptions} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import MfaScreen, {type MFAProps} from '@screens/mfa';

export default function MfaRoute() {
    const {theme: themeProp, serverUrl, ...props} = usePropsFromParams<MFAProps>();
    const theme = useThemeByAppearanceWithDefault(themeProp);

    useNavigationHeader({
        showWhenPushed: true,
        showWhenRoot: false,
        headerOptions: getLoginFlowHeaderOptions(theme),
    });

    const screenProps = {
        theme,
        serverUrl,
        ...props,
    };

    return <MfaScreen {...screenProps}/>;
}
