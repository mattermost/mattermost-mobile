// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
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
    const sendButtonTestID = disabled ? `${testID}.send.button.disabled` : `${testID}.send.button`;
    const style = getStyleSheet(theme);

    const viewStyle = useMemo(() => {
        if (disabled) {
            return [style.sendButton, style.disableButton];
        }
        return style.sendButton;
    }, [disabled, style]);

    const buttonColor = disabled ? changeOpacity(theme.buttonColor, 0.5) : theme.buttonColor;

    return (
        <TouchableWithFeedback
            testID={sendButtonTestID}
            onPress={sendMessage}
            style={style.sendButtonContainer}
            type={'opacity'}
            disabled={disabled}
        >
            <View style={viewStyle}>
                <CompassIcon
                    name='send'
                    size={24}
                    color={buttonColor}
                />
            </View>
        </TouchableWithFeedback>
    );
}

export default SendButton;
