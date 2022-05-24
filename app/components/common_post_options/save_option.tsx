// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import {deleteSavedPost, savePostPreference} from '@actions/remote/preference';
import {BaseOption} from '@components/common_post_options';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {dismissBottomSheet} from '@screens/navigation';

type CopyTextProps = {
    isSaved: boolean;
    postId: string;
}

const SaveOption = ({isSaved, postId}: CopyTextProps) => {
    const serverUrl = useServerUrl();

    const onHandlePress = useCallback(async () => {
        const remoteAction = isSaved ? deleteSavedPost : savePostPreference;
        remoteAction(serverUrl, postId);
        dismissBottomSheet(Screens.POST_OPTIONS);
    }, [postId, serverUrl]);

    const id = isSaved ? t('mobile.post_info.unsave') : t('mobile.post_info.save');
    const defaultMessage = isSaved ? 'Unsave' : 'Save';

    return (
        <BaseOption
            i18nId={id}
            defaultMessage={defaultMessage}
            iconName='bookmark-outline'
            onPress={onHandlePress}
            testID={`post_options.${defaultMessage.toLocaleLowerCase()}_post.option`}
        />
    );
};

export default SaveOption;
