// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback} from 'react';

import {useTheme} from '@context/theme';
import {getModalHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import IntegrationsSelector, {type Props} from '@screens/integration_selector';
import {navigateBack} from '@screens/navigation';
import SettingsStore from '@store/settings_store';

export default function IntegrationSelectorRoute() {
    const theme = useTheme();
    const {title, ...props} = usePropsFromParams<Props & {title: string}>();

    const onClose = useCallback(() => {
        SettingsStore.removeIntegrationsSelectCallback();
        SettingsStore.removeIntegrationsDynamicOptionsCallback();
        navigateBack();
    }, []);

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: title,
            ...getModalHeaderOptions(theme, onClose, 'integration_selector.cancel.button'),
        },
    });

    return (<IntegrationsSelector {...props}/>);
}
