// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import {deletePost, revealBoRPost} from '@actions/remote/post';
import Button from '@components/button';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {PostModel} from '@database/models/server';
import {getFullErrorMessage, getServerError} from '@utils/errors';
import {showBoRPostErrorSnackbar} from '@utils/snack_bar';

import {BOR_GLOBALLY_EXPIRED_POST_ERROR_CODE, BOR_POST_EXPIRED_FOR_USER_ERROR_CODE} from './constants';
type Props = {
    post: PostModel;
}

export default function UnrevealedBurnOnReadPost({post}: Props) {
    const theme = useTheme();
    const serverUrl = useServerUrl();

    const handleRevealPost = useCallback(async () => {
        const {error} = await revealBoRPost(serverUrl, post.id);
        if (error) {
            showBoRPostErrorSnackbar(getFullErrorMessage(error));

            const serverError = getServerError(error);
            if (serverError === BOR_POST_EXPIRED_FOR_USER_ERROR_CODE || serverError === BOR_GLOBALLY_EXPIRED_POST_ERROR_CODE) {
                deletePost(serverUrl, post);
            }
        }

    }, [serverUrl, post]);

    return (
        <Button
            text={'View message'}
            iconName='eye-outline'
            theme={theme}
            emphasis='tertiary'
            size='lg'
            onPress={handleRevealPost}
        />
    );
}
