// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useTheme} from '@context/theme';
import {getModalHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import AppFormScreen, {type AppFormScreenProps} from '@screens/apps_form';
import {navigateBack} from '@screens/navigation';

export default function AppsFormRoute() {
    const theme = useTheme();
    const {title, ...props} = usePropsFromParams<AppFormScreenProps & {title?: string}>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: title || '',
            ...getModalHeaderOptions(theme, navigateBack, 'close.apps_form.button'),
        },
    });

    return (<AppFormScreen {...props}/>);
}
