// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import React, {useEffect} from 'react';

import {useThemeByAppearanceWithDefault} from '@context/theme';
import {useNavigationHeader, getLoginFlowHeaderOptions, getLoginModalHeaderOptions} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import NetworkManager from '@managers/network_manager';
import LoginScreen, {type LoginOptionsProps} from '@screens/login';
import {navigateBack} from '@screens/navigation';

export default function LoginRoute() {
    const navigation = useNavigation();
    const {theme: themeProp, isModal, isStackRoot, serverUrl, ...props} = usePropsFromParams<LoginOptionsProps & {isStackRoot?: boolean; isModal?: boolean}>();
    const theme = useThemeByAppearanceWithDefault(themeProp);

    useNavigationHeader({
        showWhenPushed: true,
        showWhenRoot: false,
        animation: isModal ? 'slide_from_bottom' : 'none',
        headerOptions: isStackRoot ? getLoginModalHeaderOptions(theme, navigateBack, 'close.login.button') : getLoginFlowHeaderOptions(theme),
    });

    // Invalidate client when user navigates back (not when navigating forward)
    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            if (e.data.action.type === 'POP' || e.data.action.type === 'GO_BACK') {
                if (serverUrl) {
                    NetworkManager.invalidateClient(serverUrl);
                }
            }
        });

        return unsubscribe;
    }, [navigation, serverUrl]);

    const screenProps = {
        animated: !isModal,
        isModal,
        theme,
        serverUrl,
        ...props,
    };

    return <LoginScreen {...screenProps}/>;
}
