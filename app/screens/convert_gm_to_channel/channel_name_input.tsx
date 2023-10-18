// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import FloatingTextInput from '@app/components/floating_text_input_label';
import {Channel} from '@app/constants';
import {useTheme} from '@app/context/theme';
import {t} from '@app/i18n';
import {getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@app/utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    fieldContainer: {
        marginBottom: 32,
    },
}));

export const ChannelNameInput = () => {
    const {formatMessage} = useIntl();
    const theme = useTheme();

    const labelDisplayName = formatMessage({id: t('channel_modal.name'), defaultMessage: 'Name'});
    const placeholder = formatMessage({id: t('"channel_modal.name": "Name",'), defaultMessage: 'Channel Name'});

    const styles = getStyleSheet(theme);

    return (
        <FloatingTextInput
            autoCorrect={false}
            autoCapitalize='none'
            blurOnSubmit={false}
            disableFullscreenUI={true}
            enablesReturnKeyAutomatically={true}
            label={labelDisplayName}
            placeholder={placeholder}
            maxLength={Channel.MAX_CHANNEL_NAME_LENGTH}
            keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
            returnKeyType='next'
            showErrorIcon={false}
            spellCheck={false}
            testID='gonvert_gm_to_channel.channel_display_name.input'
            containerStyle={styles.fieldContainer}
            theme={theme}
        />
    );
};
