// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, View} from 'react-native';

import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import {useDebounce} from '@hooks/utils';
import {setShareExtensionMessage, useShareExtensionMessage} from '@share/state';

type Props = {
    theme: Theme;
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 20,
        marginTop: 20,
    },
});

const Message = ({theme}: Props) => {
    const intl = useIntl();
    const message = useShareExtensionMessage();

    const label = useMemo(() => {
        return intl.formatMessage({
            id: 'share_extension.message',
            defaultMessage: 'Enter a message (optional)',
        });
    }, [intl]);

    const onChangeText = useDebounce(useCallback(((text: string) => {
        setShareExtensionMessage(text);
    }), []), 250);

    return (
        <View style={styles.container}>
            <FloatingTextInput
                label={label}
                multiline={true}
                onChangeText={onChangeText}
                theme={theme}
                defaultValue={message || ''}
                multilineInputHeight={154}
            />
        </View>
    );
};

export default Message;
