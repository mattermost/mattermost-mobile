// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import CompassIcon from '@components/compass_icon';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {t} from '@i18n';
import {dismissBottomSheet, dismissModal, showModal} from '@screens/navigation';

import BaseOption from './base_option';

import type PostModel from '@typings/database/models/servers/post';

type Props = {
    post: PostModel;
    componentId: string;
    canEdit: boolean;
}
const EditOption = ({post, componentId, canEdit}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const isTablet = useIsTablet();

    const onPress = useCallback(async () => {
        if (isTablet) {
            await dismissModal({componentId});
        }
        await dismissBottomSheet(Screens.POST_OPTIONS);
        const title = intl.formatMessage({id: 'mobile.edit_post.title', defaultMessage: 'Editing Message'});
        const closeButton = CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor);
        const passProps = {post, closeButton, canEdit};
        const options = {modal: {swipeToDismiss: false}};
        showModal(Screens.EDIT_POST, title, passProps, options);
    }, [post]);

    return (
        <BaseOption
            i18nId={t('post_info.edit')}
            defaultMessage='Edit'
            onPress={onPress}
            iconName='pencil-outline'
            testID='post.options.edit'
        />
    );
};

export default EditOption;
