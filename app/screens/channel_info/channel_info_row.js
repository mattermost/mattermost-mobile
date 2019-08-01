// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {
    Image,
    Switch,
    Text,
    TouchableHighlight,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import FormattedText from 'app/components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';

function createTouchableComponent(children, action) {
    return (
        <TouchableHighlight onPress={action}>
            {children}
        </TouchableHighlight>
    );
}

function channelInfoRow(props) {
    const {action, defaultMessage, detail, icon, iconColor, image, imageTintColor, textColor, textId, togglable, theme, shouldRender, isLandscape} = props;

    if (!shouldRender) {
        return null;
    }

    const style = getStyleSheet(theme);

    let iconElement = null;
    if (image == null) {
        iconElement = (
            <Icon
                name={icon}
                size={15}
                color={iconColor || changeOpacity(theme.centerChannelColor, 0.5)}
                style={style.leftIcon}
            />
        );
    } else {
        iconElement = (
            <Image
                source={image}
                style={{width: 15, height: 15, tintColor: imageTintColor || changeOpacity(theme.centerChannelColor, 0.5)}}
            />
        );
    }

    const RowComponent = (
        <View style={[style.container, padding(isLandscape)]}>
            {iconElement}
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
    icon: PropTypes.string,
    iconColor: PropTypes.string,
    image: PropTypes.number,
    imageTintColor: PropTypes.string,
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
