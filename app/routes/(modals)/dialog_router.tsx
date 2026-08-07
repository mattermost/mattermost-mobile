// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';

import {useTheme} from '@context/theme';
import useInitialValue from '@hooks/initial_value';
import {getModalHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import DialogRouterScreen from '@screens/dialog_router';
import {navigateBack} from '@screens/navigation';
import CallbackStore from '@store/callback_store';

import type {DialogRouterProps} from '@screens/dialog_router/dialog_router';

export default function DialogRouterRoute() {
    const theme = useTheme();
    const {title, config: configFromParams} = usePropsFromParams<DialogRouterProps & {title?: string}>();

    // Capture once on mount — IntegrationsManager stores config in CallbackStore before navigate.
    // Prefer that over URL params, which can truncate large dialog payloads.
    const config = useInitialValue(() => {
        return CallbackStore.getCallback<InteractiveDialogConfig>() || configFromParams;
    });

    useEffect(() => {
        return () => {
            CallbackStore.removeCallback();
        };
    }, []);

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: title || config?.block_dialog?.title || config?.dialog?.title,
            ...getModalHeaderOptions(theme, navigateBack, 'close.interactive_dialog.button'),
        },
    });

    if (!config) {
        return null;
    }

    return (
        <DialogRouterScreen config={config}/>
    );
}
