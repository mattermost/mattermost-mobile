// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import {deletePost, revealBoRPost} from '@actions/remote/post';
import Button from '@components/button';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {PostModel} from '@database/models/server';
import {getFullErrorMessage, isErrorWithStatusCode} from '@utils/errors';
import {showBoRPostExpiredSnackbar} from '@utils/snack_bar';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    buttonBackgroundStyle: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        height: 56,
        marginBottom: 8,
    },
    buttonTextStyle: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
    },
}));

type Props = {
    post: PostModel;
}

export default function UnrevealedBurnOnReadPost({post}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const serverUrl = useServerUrl();

    const handleRevealPost = useCallback(async () => {
        const {error} = await revealBoRPost(serverUrl, post.id);
        if (error && isErrorWithStatusCode(error) && error.status_code === 400) {
            showBoRPostExpiredSnackbar(getFullErrorMessage(error));
            deletePost(serverUrl, post);
        }

    }, [serverUrl, post]);

    return (
        <Button
            text={'View message'}
            iconName='eye-outline'
            theme={theme}
            backgroundStyle={styles.buttonBackgroundStyle}
            textStyle={styles.buttonTextStyle}
            onPress={handleRevealPost}
        />
    );
}
