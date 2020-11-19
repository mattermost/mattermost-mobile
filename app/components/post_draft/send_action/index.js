// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo} from 'react';
import {View} from 'react-native';
import PropTypes from 'prop-types';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

function SendButton(props) {
    const {theme} = props;
    const style = getStyleSheet(theme);

    if (props.disabled) {
        return (
            <View
                testID='post_draft.send.button.disabled'
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
            testID='post_draft.send.button'
            onPress={props.handleSendMessage}
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

SendButton.propTypes = {
    handleSendMessage: PropTypes.func.isRequired,
    disabled: PropTypes.bool.isRequired,
    theme: PropTypes.object.isRequired,
};

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

export default memo(SendButton);
