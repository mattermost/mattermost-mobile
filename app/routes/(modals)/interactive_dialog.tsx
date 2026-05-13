// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useTheme} from '@context/theme';
import {getModalHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import InteractiveDialogScreen, {type InteractiveDialogScreenProps} from '@screens/interactive_dialog';
import {navigateBack} from '@screens/navigation';

export default function InteractiveDialogRoute() {
    const theme = useTheme();
    const {title, ...props} = usePropsFromParams<InteractiveDialogScreenProps & {title?: string}>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: title,
            ...getModalHeaderOptions(theme, navigateBack, 'close.interactive_dialog.button'),
        },
    });

    return (<InteractiveDialogScreen {...props}/>);
}
