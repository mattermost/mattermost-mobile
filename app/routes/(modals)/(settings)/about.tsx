// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import SettingsAboutScreen from '@screens/settings/about';

type Props = {
    headerTitle?: string;
};

export default function SettingsAboutRoute() {
    const {headerTitle} = usePropsFromParams<Props>();
    const theme = useTheme();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle,
            ...getHeaderOptions(theme),
        },
    });

    return (<SettingsAboutScreen/>);
}
