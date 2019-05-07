// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo} from 'react';
import {TouchableOpacity, View} from 'react-native';

import PropTypes from 'prop-types';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

let PaperPlane = null;

function SendButton(props) {
    const {theme} = props;
    const style = getStyleSheet(theme);

    if (!PaperPlane) {
        PaperPlane = require('app/components/paper_plane').default;
    }

    const icon = (
        <PaperPlane
            height={13}
            width={15}
            color={theme.buttonColor}
        />
    );

    if (props.disabled) {
        return (
            <View style={style.sendButtonContainer}>
                <View style={[style.sendButton, style.disableButton]}>
                    {icon}
                </View>
            </View>
        );
    }

    return (
        <TouchableOpacity
            onPress={props.handleSendMessage}
            style={style.sendButtonContainer}
        >
            <View style={style.sendButton}>
                {icon}
            </View>
        </TouchableOpacity>
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
            paddingHorizontal: 5,
            paddingVertical: 3,
        },
        sendButton: {
            backgroundColor: theme.buttonBg,
            borderRadius: 18,
            height: 28,
            width: 28,
            alignItems: 'center',
            justifyContent: 'center',
        },
    };
});

export default memo(SendButton);
