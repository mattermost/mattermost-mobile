// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NavigationHeaderTitle from '@components/navigation_header_title';
import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import PlaybookSelectUserScreen, {type Props} from '@playbooks/screens/select_user';

export default function PlaybookSelectUserRoute() {
    const theme = useTheme();
    const {title, runName, ...props} = usePropsFromParams<Props & {title: string; runName: string}>();

    useNavigationHeader({
        showWhenRoot: true,
        showWhenPushed: true,
        headerOptions: {
            headerTitle: () => {
                return (
                    <NavigationHeaderTitle
                        title={title}
                        subtitle={runName}
                    />
                );
            },
            ...getHeaderOptions(theme),
        },
    });

    return <PlaybookSelectUserScreen {...props}/>;
}
