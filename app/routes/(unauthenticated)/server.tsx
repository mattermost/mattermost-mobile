// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {useThemeByAppearanceWithDefault} from '@context/theme';
import {useNavigationHeader, getLoginFlowHeaderOptions, getLoginModalHeaderOptions} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import {navigateBack} from '@screens/navigation';
import ServerComponent from '@screens/server';

import type {LaunchProps} from '@typings/launch';

export default function ServerScreen() {
    const {theme: themeProp, isModal, isStackRoot, ...props} = usePropsFromParams<LaunchProps & {theme: Theme; isModal?: boolean; isStackRoot?: boolean}>();
    const theme = useThemeByAppearanceWithDefault(themeProp);

    useNavigationHeader({
        showWhenPushed: true,
        showWhenRoot: false,
        animation: isModal ? 'slide_from_bottom' : 'none',
        headerOptions: isStackRoot ? getLoginModalHeaderOptions(theme, navigateBack, 'close.server.button') : getLoginFlowHeaderOptions(theme),
    });

    const screenProps = {
        animated: !isModal,
        isModal,
        theme,
        ...props,
    };

    return <ServerComponent {...screenProps}/>;
}
