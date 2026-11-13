// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineMessages, useIntl} from 'react-intl';

import NavigationHeaderTitle from '@components/navigation_header_title';
import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import FillRequirements, {type FillRequirementsProps} from '@playbooks/screens/playbook_run/checklist/checklist_item/fill_requirements';

const messages = defineMessages({
    completeTitle: {
        id: 'playbooks.checklist_item.requirements.complete_title',
        defaultMessage: 'Complete requirements',
    },
    editTitle: {
        id: 'playbooks.checklist_item.requirements.edit_title',
        defaultMessage: 'Edit requirements',
    },
});

export default function PlaybookFillRequirementsRoute() {
    const intl = useIntl();
    const theme = useTheme();
    const props = usePropsFromParams<FillRequirementsProps>();
    const editTitle = props.editMode || props.currentState === 'closed';

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: () => (
                <NavigationHeaderTitle
                    title={intl.formatMessage(editTitle ? messages.editTitle : messages.completeTitle)}
                />
            ),
            ...getHeaderOptions(theme),
        },
    });

    return (
        <FillRequirements {...props}/>
    );
}
