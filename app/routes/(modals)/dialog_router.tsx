// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect} from 'react';

import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {getModalHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import IntegrationsManager from '@managers/integrations_manager';
import DialogRouterScreen from '@screens/dialog_router';
import {navigateBack} from '@screens/navigation';

import type {DialogRouterProps} from '@screens/dialog_router/dialog_router';

export default function DialogRouterRoute() {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const {title, ...props} = usePropsFromParams<DialogRouterProps & {title?: string}>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: title,
            ...getModalHeaderOptions(theme, navigateBack, 'close.interactive_dialog.button'),
        },
    });

    useEffect(() => {
        return () => {
            IntegrationsManager.getManager(serverUrl).closeDialog(props.config.trigger_id);
        };
    }, [serverUrl, props.config.trigger_id]);

    return (<DialogRouterScreen {...props}/>);
}
