// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import React, {useEffect} from 'react';

import {useThemeByAppearanceWithDefault} from '@context/theme';
import {useNavigationHeader, getLoginFlowHeaderOptions, getLoginModalHeaderOptions} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import NetworkManager from '@managers/network_manager';
import {navigateBack} from '@screens/navigation';
import SsoComponent, {type SSOProps} from '@screens/sso';

export default function SsoScreen() {
    const navigation = useNavigation();
    const {isModal, isStackRoot, theme: themeProp, serverUrl, ...props} = usePropsFromParams<SSOProps & {isStackRoot?: boolean}>();
    const theme = useThemeByAppearanceWithDefault(themeProp);

    useNavigationHeader({
        showWhenPushed: true,
        showWhenRoot: false,
        animation: isStackRoot ? 'slide_from_bottom' : 'none',
        headerOptions: isStackRoot ? getLoginModalHeaderOptions(theme, navigateBack, 'close.sso.button') : getLoginFlowHeaderOptions(theme),
    });

    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            if (e.data.action.type === 'POP' || e.data.action.type === 'GO_BACK') {
                if (serverUrl && isModal) {
                    NetworkManager.invalidateClient(serverUrl);
                }
            }
        });

        return unsubscribe;
    }, [isModal, navigation, serverUrl]);

    const screenProps = {
        isModal,
        theme,
        serverUrl,
        ...props,
    };

    return <SsoComponent {...screenProps}/>;
}
