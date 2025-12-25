// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {useThemeByAppearanceWithDefault} from '@context/theme';
import {useNavigationHeader, getLoginFlowHeaderOptions} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import MfaComponent, {type MFAProps} from '@screens/mfa';

export default function MfaScreen() {
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

    return <MfaComponent {...screenProps}/>;
}
