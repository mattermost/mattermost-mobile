// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import NavigationHeaderTitle from '@components/navigation_header_title';
import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import FillRequirements, {type FillRequirementsProps} from '@playbooks/screens/playbook_run/checklist/checklist_item/fill_requirements';

export default function PlaybookFillRequirementsRoute() {
    const intl = useIntl();
    const theme = useTheme();
    const props = usePropsFromParams<FillRequirementsProps>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: () => (
                <NavigationHeaderTitle
                    title={intl.formatMessage({
                        id: 'playbooks.checklist_item.requirements.complete_title',
                        defaultMessage: 'Complete requirements',
                    })}
                />
            ),
            ...getHeaderOptions(theme),
        },
    });

    return (
        <FillRequirements {...props}/>
    );
}
