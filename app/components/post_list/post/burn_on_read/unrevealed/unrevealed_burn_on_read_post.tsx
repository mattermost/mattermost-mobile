// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import {revealBoRPost} from '@actions/remote/post';
import Button from '@components/button';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
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
    postId: string;
}

export default function UnrevealedBurnOnReadPost({postId}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const serverUrl = useServerUrl();

    const handleRevealPost = useCallback(async () => {
        await revealBoRPost(serverUrl, postId);
    }, [postId, serverUrl]);

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
