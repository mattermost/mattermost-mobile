// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import CodeScreen, {type CodeScreenProps} from '@screens/code';

export default function IntegrationSelectorRoute() {
    const theme = useTheme();
    const {title, ...props} = usePropsFromParams<CodeScreenProps & {title: string}>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: title,
            ...getHeaderOptions(theme),
        },
    });

    return (<CodeScreen {...props}/>);
}
