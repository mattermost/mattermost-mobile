// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Text} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {usePreventDoubleTap} from '@hooks/utils';
import {getServerCredentials} from '@init/credentials';
import {useShareExtensionState} from '@share/state';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    theme: Theme;
}

const hitSlop = {top: 10, left: 10, right: 10, bottom: 10};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        buttonContainer: {
            alignSelf: 'center',
            marginTop: 'auto',
            flexDirection: 'row',
            marginBottom: 40,
            alignItems: 'center',
        },
        draftIcon: {
            color: theme.linkColor,
            ...typography('Body', 500),
        },
        buttonText: {
            marginLeft: 10,
            color: theme.linkColor,
            ...typography('Body', 200, 'SemiBold'),
        },
    };
});

const SaveDraftButton = ({theme}: Props) => {
    const intl = useIntl();
    const {
        closeExtension, channelId, files,
        linkPreviewUrl, message, serverUrl, userId,
    } = useShareExtensionState();
    const styles = getStyleSheet(theme);

    const onPress = usePreventDoubleTap(useCallback(async () => {
        if (!serverUrl || !channelId || !userId) {
            return;
        }

        let text = message || '';
        if (linkPreviewUrl) {
            if (text) {
                text = `${text}\n\n${linkPreviewUrl}`;
            } else {
                text = linkPreviewUrl;
            }
        }

        const credentials = await getServerCredentials(serverUrl);
        if (credentials?.token) {
            closeExtension({
                serverUrl,
                token: credentials.token,
                channelId,
                files,
                message: text,
                userId,
                preauthSecret: credentials.preauthSecret,
                isDraft: true,
            });
        }
    }, [channelId, closeExtension, files, linkPreviewUrl, message, serverUrl, userId]));

    return (
        <TouchableWithFeedback
            onPress={onPress}
            type={'opacity'}
            hitSlop={hitSlop}
            style={styles.buttonContainer}
        >
            <CompassIcon
                name='pencil-outline'
                style={styles.draftIcon}
            />
            <Text style={styles.buttonText}>
                {intl.formatMessage({id: 'share_extension.save_draft', defaultMessage: 'Save as draft'})}
            </Text>
        </TouchableWithFeedback>
    );
};

export default SaveDraftButton;
