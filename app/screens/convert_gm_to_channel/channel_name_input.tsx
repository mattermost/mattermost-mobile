// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import FloatingTextInput from '@components/floating_text_input_label';
import {Channel} from '@constants';
import {useTheme} from '@context/theme';
import {getKeyboardAppearanceFromTheme} from '@utils/theme';

type Props = {
    error?: string;
    onChange: (text: string) => void;
}

export const ChannelNameInput = ({error, onChange}: Props) => {
    const {formatMessage} = useIntl();
    const theme = useTheme();

    const labelDisplayName = formatMessage({id: 'channel_modal.name', defaultMessage: 'Name'});
    const placeholder = formatMessage({id: 'channel_modal.name', defaultMessage: 'Channel Name'});

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
            showErrorIcon={true}
            spellCheck={false}
            testID='gonvert_gm_to_channel.channel_display_name.input'
            theme={theme}
            error={error}
            onChangeText={onChange}
        />
    );
};
