// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import {deleteSavedPost, savePostPreference} from '@actions/remote/preference';
import {BaseOption} from '@components/common_post_options';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {dismissBottomSheet} from '@screens/navigation';

import type {AvailableScreens} from '@typings/screens/navigation';

type CopyTextProps = {
    bottomSheetId: AvailableScreens;
    isSaved: boolean;
    postId: string;
}

const SaveOption = ({bottomSheetId, isSaved, postId}: CopyTextProps) => {
    const serverUrl = useServerUrl();

    const onHandlePress = useCallback(async () => {
        const remoteAction = isSaved ? deleteSavedPost : savePostPreference;
        await dismissBottomSheet(bottomSheetId);
        remoteAction(serverUrl, postId);
    }, [bottomSheetId, postId, serverUrl]);

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
