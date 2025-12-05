// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import {removePost} from '@actions/local/post';
import {revealBoRPost} from '@actions/remote/post';
import Button from '@components/button';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {PostModel} from '@database/models/server';
import {getFullErrorMessage, getServerError} from '@utils/errors';
import {showBoRPostErrorSnackbar} from '@utils/snack_bar';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import {BOR_ERROR_CODES} from './constants';

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
    const intl = useIntl();

    const handleRevealPost = useCallback(async () => {
        const {error} = await revealBoRPost(serverUrl, post.id);
        if (error) {
            showBoRPostErrorSnackbar(getFullErrorMessage(error));

            const serverError = getServerError(error);
            if (serverError && BOR_ERROR_CODES.includes(serverError)) {
                await removePost(serverUrl, post);
            }
        }

    }, [serverUrl, post]);

    return (
        <Button
            text={intl.formatMessage({id: 'mobile.burn_on_read.placeholder', defaultMessage: 'View message'})}
            iconName='eye-outline'
            theme={theme}
            backgroundStyle={styles.buttonBackgroundStyle}
            textStyle={styles.buttonTextStyle}
            onPress={handleRevealPost}
        />
    );
}
