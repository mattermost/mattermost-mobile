// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo} from 'react';
import {View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    testID: string;
    disabled: boolean;
    sendMessage: () => void;
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        disableButton: {
            backgroundColor: changeOpacity(theme.buttonBg, 0.3),
        },
        sendButtonContainer: {
            justifyContent: 'flex-end',
            paddingRight: 8,
        },
        sendButton: {
            backgroundColor: theme.buttonBg,
            borderRadius: 4,
            height: 32,
            width: 80,
            alignItems: 'center',
            justifyContent: 'center',
        },
    };
});

function SendButton({
    testID,
    disabled,
    sendMessage,
}: Props) {
    const theme = useTheme();
    const sendButtonTestID = `${testID}.send.button`;
    const sendButtonDisabledTestID = `${testID}.send.button.disabled`;
    const style = getStyleSheet(theme);

    if (disabled) {
        return (
            <View
                testID={sendButtonDisabledTestID}
                style={style.sendButtonContainer}
            >
                <View style={[style.sendButton, style.disableButton]}>
                    <CompassIcon
                        name='send'
                        size={24}
                        color={changeOpacity(theme.buttonColor, 0.5)}
                    />
                </View>
            </View>
        );
    }

    return (
        <TouchableWithFeedback
            testID={sendButtonTestID}
            onPress={sendMessage}
            style={style.sendButtonContainer}
            type={'opacity'}
        >
            <View style={style.sendButton}>
                <CompassIcon
                    name='send'
                    size={24}
                    color={theme.buttonColor}
                />
            </View>
        </TouchableWithFeedback>
    );
}

export default memo(SendButton);
