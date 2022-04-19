// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Clipboard from '@react-native-community/clipboard';
import React, {useCallback} from 'react';

import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {dismissBottomSheet} from '@screens/navigation';

import BaseOption from '../base_option';

import type PostModel from '@typings/database/models/servers/post';

type Props = {
    teamName: string;
    post: PostModel;
}
const CopyPermalinkOption = ({teamName, post}: Props) => {
    const serverUrl = useServerUrl();

    const handleCopyLink = useCallback(() => {
        const permalink = `${serverUrl}/${teamName}/pl/${post.id}`;
        Clipboard.setString(permalink);
        dismissBottomSheet(Screens.POST_OPTIONS);
    }, [teamName, post.id]);

    return (
        <BaseOption
            i18nId={t('get_post_link_modal.title')}
            defaultMessage='Copy Link'
            onPress={handleCopyLink}
            iconName='link-variant'
            testID='post_options.copy.permalink.option'
        />
    );
};

export default CopyPermalinkOption;
