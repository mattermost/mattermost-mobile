// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback} from 'react';

import {deleteSavedPost, savePostPreference} from '@actions/remote/preference';
import {BaseOption} from '@components/common_post_options';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {dismissBottomSheet} from '@screens/navigation';

type Props = {
    isSaved: boolean;
    threadId: string;
}
const SaveOption = ({isSaved, threadId}: Props) => {
    const serverUrl = useServerUrl();

    const onHandlePress = useCallback(async () => {
        const remoteAction = isSaved ? deleteSavedPost : savePostPreference;
        remoteAction(serverUrl, threadId);
        dismissBottomSheet(Screens.THREAD_OPTIONS);
    }, [threadId, serverUrl]);

    const id = isSaved ? t('mobile.post_info.unsave') : t('mobile.post_info.save');
    const defaultMessage = isSaved ? 'Unsave' : 'Save';

    return (
        <BaseOption
            i18nId={id}
            defaultMessage={defaultMessage}
            iconName='bookmark-outline'
            onPress={onHandlePress}
            testID='thread.options.save'
        />
    );
};

export default SaveOption;
