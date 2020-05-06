// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Image} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import TouchableWithFeedback from '@components/touchable_with_feedback';
import {ICON_SIZE} from '@constants/post_draft';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

export default class InputQuickAction extends PureComponent {
    static propTypes = {
        disabled: PropTypes.bool,
        inputType: PropTypes.oneOf(['at', 'slash']).isRequired,
        onTextChange: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
        value: PropTypes.string,
    };

    static defaultProps = {
        value: '',
    };

    constructor(props) {
        super(props);

        this.value = '';
    }

    onPress = () => {
        const {inputType, onTextChange, value} = this.props;

        let newValue = '/';
        if (inputType === 'at') {
            newValue = `${value}@`;
        }

        onTextChange(newValue);
    }

    renderInput = (style) => {
        const {disabled, inputType, theme} = this.props;

        if (inputType === 'at') {
            const color = disabled ?
                changeOpacity(theme.centerChannelColor, 0.16) :
                changeOpacity(theme.centerChannelColor, 0.64);

            return (
                <MaterialCommunityIcons
                    color={color}
                    name='at'
                    size={ICON_SIZE}
                />
            );
        }

        return (
            <Image
                source={require('assets/images/icons/slash-forward-box.png')}
                style={[style.slash, disabled ? style.disabled : null]}
            />
        );
    }

    render() {
        const {disabled, theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <TouchableWithFeedback
                disabled={disabled}
                onPress={this.onPress}
                style={style.icon}
                type={'opacity'}
            >
                {this.renderInput(style)}
            </TouchableWithFeedback>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        slash: {
            width: ICON_SIZE,
            height: ICON_SIZE,
            opacity: 1,
            tintColor: changeOpacity(theme.centerChannelColor, 0.64),
        },
        disabled: {
            tintColor: changeOpacity(theme.centerChannelColor, 0.16),
        },
        icon: {
            alignItems: 'center',
            justifyContent: 'center',
            padding: 10,
        },
    };
});