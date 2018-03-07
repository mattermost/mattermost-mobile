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
import Icon from 'react-native-vector-icons/FontAwesome';

import FormattedText from 'app/components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

function createTouchableComponent(children, action) {
    return (
        <TouchableHighlight onPress={action}>
            {children}
        </TouchableHighlight>
    );
}

function channelInfoRow(props) {
    const {action, defaultMessage, detail, icon, iconColor, textColor, textId, togglable, theme, shouldRender} = props;

    if (!shouldRender) {
        return null;
    }

    const style = getStyleSheet(theme);

    const RowComponent = (
        <View style={style.container}>
            <Icon
                name={icon}
                size={15}
                color={iconColor || changeOpacity(theme.centerChannelColor, 0.5)}
                style={style.leftIcon}
            />
            <FormattedText
                style={[style.label, {color: textColor || theme.centerChannelColor}]}
                id={textId}
                defaultMessage={defaultMessage}
            />
            <Text style={style.detail}>{detail}</Text>
            {togglable ?
                <Switch
                    onValueChange={action}
                    value={detail}
                /> :
                <Icon
                    name='angle-right'
                    size={20}
                    style={style.rightIcon}
                />
            }
        </View>
    );

    if (togglable) {
        return RowComponent;
    }

    return createTouchableComponent(RowComponent, action);
}

channelInfoRow.propTypes = {
    action: PropTypes.func.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    detail: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
        PropTypes.bool,
    ]),
    icon: PropTypes.string.isRequired,
    iconColor: PropTypes.string,
    textId: PropTypes.string.isRequired,
    togglable: PropTypes.bool,
    textColor: PropTypes.string,
    theme: PropTypes.object.isRequired,
};

channelInfoRow.defaultProps = {
    togglable: false,
    shouldRender: true,
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            backgroundColor: theme.centerChannelBg,
            paddingHorizontal: 15,
            flexDirection: 'row',
            alignItems: 'center',
        },
        detail: {
            marginHorizontal: 15,
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 15,
        },
        label: {
            flex: 1,
            marginLeft: 15,
            fontSize: 15,
            paddingVertical: 15,
        },
        leftIcon: {
            width: 17,
        },
        rightIcon: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
    };
});

export default channelInfoRow;
