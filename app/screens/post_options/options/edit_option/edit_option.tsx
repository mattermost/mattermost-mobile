// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import {BaseOption} from '@components/common_post_options';
import CompassIcon from '@components/compass_icon';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {dismissBottomSheet, showModal} from '@screens/navigation';

import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    bottomSheetId: AvailableScreens;
    post: PostModel;
    canDelete: boolean;
    files?: FileInfo[];
}
const EditOption = ({bottomSheetId, post, canDelete, files}: Props) => {
    const intl = useIntl();
    const theme = useTheme();

    const onPress = useCallback(async () => {
        await dismissBottomSheet(bottomSheetId);

        const title = intl.formatMessage({id: 'mobile.edit_post.title', defaultMessage: 'Editing Message'});
        const closeButton = CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor);
        const closeButtonId = 'close-edit-post';
        const passProps = {post, closeButtonId, canDelete, files};
        const options = {
            topBar: {
                leftButtons: [{
                    id: closeButtonId,
                    testID: 'close.edit_post.button',
                    icon: closeButton,
                }],
            },
        };
        showModal(Screens.EDIT_POST, title, passProps, options);
    }, [bottomSheetId, canDelete, files, intl, post, theme.sidebarHeaderTextColor]);

    return (
        <BaseOption
            i18nId={t('post_info.edit')}
            defaultMessage='Edit'
            onPress={onPress}
            iconName='pencil-outline'
            testID='post_options.edit_post.option'
        />
    );
};

export default EditOption;
