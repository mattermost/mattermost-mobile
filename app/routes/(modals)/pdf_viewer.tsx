// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useTheme} from '@context/theme';
import {getModalHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import {navigateBack} from '@screens/navigation';
import PdfViewerScreen, {type PdfViewerScreenProps} from '@screens/pdf_viewer';

export default function PdfViewerRoute() {
    const {title, ...props} = usePropsFromParams<PdfViewerScreenProps>();
    const theme = useTheme();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: title,
            ...getModalHeaderOptions(theme, navigateBack, 'close.edit_profile.button'),
        },
    });

    return (<PdfViewerScreen {...props}/>);
}
