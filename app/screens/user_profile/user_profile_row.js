// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {
    Switch,
    Text,
    TouchableHighlight,
    View,
} from 'react-native';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import FormattedText from 'app/components/formatted_text';
import VectorIcon from 'app/components/vector_icon.js';

const createStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            backgroundColor: changeOpacity(theme.centerChannelBg, 0.7),
            paddingHorizontal: 15,
            flexDirection: 'row',
            alignItems: 'center',
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.3),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.3),
        },
        detail: {
            marginHorizontal: 15,
            color: 'rgba(0, 0, 0, 0.5)',
            fontSize: 15,
        },
        label: {
            flex: 1,
            marginLeft: 15,
            fontSize: 15,
            paddingVertical: 15,
            color: theme.centerChannelColor,
        },
        leftIcon: {
            width: 17,
            color: theme.centerChannelColor,
        },
        rightIcon: {
            color: theme.centerChannelColor,
            opacity: 0.7,
        },
        wrapper: {
            backgroundColor: '#ddd',
        },
    };
});

function createTouchableComponent(children, action) {
    return (
        <TouchableHighlight onPress={action}>
            {children}
        </TouchableHighlight>
    );
}

function userProfileRow(props) {
    const {action, defaultMessage, detail, icon, textId, togglable, theme, iconType, iconSize, shouldRender = true} = props;

    if (!shouldRender) {
        return null;
    }

    const style = createStyleSheet(theme);

    const RowComponent = (
        <View style={style.wrapper}>
            <View style={style.container}>
                <VectorIcon
                    name={icon}
                    size={iconSize}
                    type={iconType}
                    style={style.leftIcon}
                />
                <FormattedText
                    style={[style.label]}
                    id={textId}
                    defaultMessage={defaultMessage}
                />
                <Text style={style.detail}>{detail}</Text>
                {togglable ?
                    <Switch
                        onValueChange={action}
                        value={detail}
                    /> :
                    <VectorIcon
                        name='chevron-right'
                        size={15}
                        type={'fontawesome'}
                        style={style.rightIcon}
                    />
                }
            </View>
        </View>
    );

    if (togglable) {
        return RowComponent;
    }

    return createTouchableComponent(RowComponent, action);
}

userProfileRow.propTypes = {
    action: PropTypes.func.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    detail: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
        PropTypes.bool,
    ]),
    icon: PropTypes.string.isRequired,
    iconType: PropTypes.oneOf(['fontawesome', 'foundation', 'ion', 'material']),
    iconColor: PropTypes.string,
    iconSize: PropTypes.number,
    textId: PropTypes.string.isRequired,
    togglable: PropTypes.bool,
    textColor: PropTypes.string,
    theme: PropTypes.object.isRequired,
};

userProfileRow.defaultProps = {
    iconColor: 'rgba(0, 0, 0, 0.7)',
    iconSize: 15,
    textColor: '#000',
    togglable: false,
};

export default userProfileRow;
