// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import NavigationHeaderTitle from '@components/navigation_header_title';
import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import PlaybookAddChecklistItemScreen from '@playbooks/screens/playbook_run/checklist/add_checklist_item_bottom_sheet';

type Props = {
    subtitle: string;
}

export default function PlaybooksAddChecklistItemRoute() {
    const intl = useIntl();
    const theme = useTheme();
    const {subtitle} = usePropsFromParams<Props>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: () => {
                return (
                    <NavigationHeaderTitle
                        title={intl.formatMessage({id: 'playbooks.checklist_item.add.title', defaultMessage: 'New Task'})}
                        subtitle={subtitle}
                    />
                );
            },
            ...getHeaderOptions(theme),
        },
    });

    return <PlaybookAddChecklistItemScreen/>;
}
