// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {View} from 'react-native';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';

import TouchableWithFeedback from 'app/components/touchable_with_feedback';
import {accessibilityProps} from 'app/utils/accessibility';
import {t} from 'app/utils/i18n';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

let PaperPlane = null;

export default class SendButton extends PureComponent {
    static propTypes = {
        handleSendMessage: PropTypes.func.isRequired,
        disabled: PropTypes.bool.isRequired,
        theme: PropTypes.object.isRequired,
    }

    static contextTypes = {
        intl: intlShape,
    };

    render() {
        const {formatMessage} = this.context.intl;
        const {theme} = this.props;
        const style = getStyleSheet(theme);

        if (!PaperPlane) {
            PaperPlane = require('app/components/paper_plane').default;
        }

        if (this.props.disabled) {
            return (
                <View style={style.sendButtonContainer}>
                    <View style={[style.sendButton, style.disableButton]}>
                        <PaperPlane
                            height={16}
                            width={19}
                            color={changeOpacity(theme.buttonColor, 0.5)}
                        />
                    </View>
                </View>
            );
        }

        return (
            <TouchableWithFeedback
                {...accessibilityProps(formatMessage(accessibilityLabel.sendButton))}
                onPress={this.props.handleSendMessage}
                style={style.sendButtonContainer}
                type={'opacity'}
            >
                <View style={style.sendButton}>
                    <PaperPlane
                        height={16}
                        width={19}
                        color={theme.buttonColor}
                    />
                </View>
            </TouchableWithFeedback>
        );
    }
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

const accessibilityLabel = {
    sendButton: {
        id: t('accessibility.send_button'),
        defaultMessage: 'send button',
    },
};
