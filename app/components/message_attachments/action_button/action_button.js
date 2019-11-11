// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import Button from 'react-native-button';

import {preventDoubleTap} from 'app/utils/tap';
import {makeStyleSheetFromTheme} from 'app/utils/theme';
import ActionButtonText from './action_button_text';

export default class ActionButton extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            doPostActionWithCookie: PropTypes.func.isRequired,
        }).isRequired,
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        postId: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        cookie: PropTypes.string.isRequired,
        disabled: PropTypes.bool,
    };

    handleActionPress = preventDoubleTap(() => {
        const {actions, id, postId, cookie} = this.props;
        actions.doPostActionWithCookie(postId, id, cookie);
    }, 4000);

    render() {
        const {name, theme, disabled} = this.props;
        const style = getStyleSheet(theme);

        return (
            <Button
                containerStyle={style.button}
                disabledContainerStyle={style.buttonDisabled}
                onPress={this.handleActionPress}
                disabled={disabled}
            >
                <ActionButtonText
                    message={name}
                    style={style.text}
                />
            </Button>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        button: {
            borderRadius: 2,
            backgroundColor: theme.buttonBg,
            opacity: 1,
            alignItems: 'center',
            marginBottom: 2,
            marginRight: 5,
            marginTop: 10,
            paddingHorizontal: 10,
            paddingVertical: 7,
        },
        buttonDisabled: {
            backgroundColor: theme.buttonBg + '4F',
        },
        text: {
            color: theme.buttonColor,
            fontSize: 12,
            fontWeight: '600',
            lineHeight: 13,
        },
    };
});
