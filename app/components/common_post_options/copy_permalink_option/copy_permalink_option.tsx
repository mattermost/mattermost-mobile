// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Clipboard from '@react-native-community/clipboard';
import React, {useCallback} from 'react';

import {BaseOption} from '@components/common_post_options';
import {Screens} from '@constants';
import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {dismissBottomSheet} from '@screens/navigation';
import {showSnackBar} from '@utils/snack_bar';

import type PostModel from '@typings/database/models/servers/post';

type Props = {
    sourceScreen: typeof Screens[keyof typeof Screens];
    post: PostModel;
    teamName: string;
}
const CopyPermalinkOption = ({teamName, post, sourceScreen}: Props) => {
    const serverUrl = useServerUrl();

    const handleCopyLink = useCallback(async () => {
        const permalink = `${serverUrl}/${teamName}/pl/${post.id}`;
        Clipboard.setString(permalink);
        await dismissBottomSheet(Screens.POST_OPTIONS);
        showSnackBar({barType: SNACK_BAR_TYPE.LINK_COPIED, sourceScreen});
    }, [teamName, post.id]);

    return (
        <BaseOption
            i18nId={t('get_post_link_modal.title')}
            defaultMessage='Copy Link'
            onPress={handleCopyLink}
            iconName='link-variant'
            testID='post_options.copy_permalink.option'
        />
    );
};

export default CopyPermalinkOption;
