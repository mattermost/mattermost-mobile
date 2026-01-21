// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages} from 'react-intl';

import {deleteSavedPost, savePostPreference} from '@actions/remote/preference';
import {BaseOption} from '@components/common_post_options';
import {useServerUrl} from '@context/server';
import {dismissBottomSheet} from '@screens/navigation';

type CopyTextProps = {
    isSaved: boolean;
    postId: string;
}

const messages = defineMessages({
    save: {
        id: 'mobile.post_info.save',
        defaultMessage: 'Save',
    },
    unsave: {
        id: 'mobile.post_info.unsave',
        defaultMessage: 'Unsave',
    },
});

const SaveOption = ({isSaved, postId}: CopyTextProps) => {
    const serverUrl = useServerUrl();

    const onHandlePress = useCallback(async () => {
        const remoteAction = isSaved ? deleteSavedPost : savePostPreference;
        await dismissBottomSheet();
        remoteAction(serverUrl, postId);
    }, [isSaved, postId, serverUrl]);

    const message = isSaved ? messages.unsave : messages.save;

    return (
        <BaseOption
            message={message}
            iconName='bookmark-outline'
            onPress={onHandlePress}
            testID={`post_options.${message.defaultMessage.toLocaleLowerCase()}_post.option`}
        />
    );
};

export default SaveOption;
