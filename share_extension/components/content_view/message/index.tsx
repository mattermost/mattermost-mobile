// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {debounce} from 'lodash';
import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import FloatingTextInput from '@components/floating_text_input_label';
import {setShareExtensionMessage, useShareExtensionMessage} from '@share/state';
import {getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    theme: Theme;
}

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        marginHorizontal: 20,
    },
    input: {
        color: theme.centerChannelColor,
        minHeight: 154,
        ...typography('Body', 200, 'Regular'),
    },
    textInputContainer: {
        marginTop: 20,
        alignSelf: 'center',
        minHeight: 154,
        height: undefined,
    },
}));

const Message = ({theme}: Props) => {
    const intl = useIntl();
    const styles = getStyles(theme);
    const message = useShareExtensionMessage();

    const label = useMemo(() => {
        return intl.formatMessage({
            id: 'share_extension.message',
            defaultMessage: 'Enter a message (optional)',
        });
    }, [intl.locale]);

    const onChangeText = useCallback(debounce((text: string) => {
        setShareExtensionMessage(text);
    }, 250), []);

    return (
        <View style={styles.container}>
            <FloatingTextInput
                allowFontScaling={false}
                autoCapitalize='none'
                autoCorrect={false}
                autoFocus={false}
                containerStyle={styles.textInputContainer}
                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                label={label}
                multiline={true}
                onChangeText={onChangeText}
                returnKeyType='default'
                textAlignVertical='top'
                textInputStyle={styles.input}
                theme={theme}
                underlineColorAndroid='transparent'
                defaultValue={message || ''}
            />
        </View>
    );
};

export default Message;
