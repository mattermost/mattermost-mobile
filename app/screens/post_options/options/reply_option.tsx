// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import {Screens} from '@constants';
import {t} from '@i18n';
import {dismissBottomSheet, goToScreen} from '@screens/navigation';

import BaseOption from './base_option';

import type PostModel from '@typings/database/models/servers/post';

type Props = {
    post: PostModel;
}
const ReplyOption = ({post}: Props) => {
    const handleReply = useCallback(async () => {
        const rootId = post.rootId || post.id;
        await dismissBottomSheet(Screens.POST_OPTIONS);
        goToScreen(Screens.THREAD, '', {rootId}, {topBar: {visible: false}});
    }, [post]);

    return (
        <BaseOption
            i18nId={t('mobile.post_info.reply')}
            defaultMessage='Reply'
            iconName='reply-outline'
            onPress={handleReply}
            testID='post.options.reply'
        />
    );
};

export default ReplyOption;
