// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineMessages, useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getModalHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import MmBlocksTextInputScreen, {type MmBlocksTextInputProps} from '@screens/mm_blocks_text_input';
import {navigateBack} from '@screens/navigation';

type Props = MmBlocksTextInputProps & {
    title?: string;
};

const messages = defineMessages({
    title: {
        id: 'mm_blocks.text_input.title',
        defaultMessage: 'Enter text',
    },
});

export default function MmBlocksTextInputRoute() {
    const intl = useIntl();
    const theme = useTheme();
    const {title, ...props} = usePropsFromParams<Props>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: title || intl.formatMessage(messages.title),
            ...getModalHeaderOptions(theme, navigateBack, 'close.mm_blocks_text_input.button'),
        },
    });

    return (<MmBlocksTextInputScreen {...props}/>);
}
