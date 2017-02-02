// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes} from 'react';
import {
    StyleSheet,
    Switch,
    Text,
    TouchableHighlight,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import FormattedText from 'app/components/formatted_text';

const style = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        paddingHorizontal: 15,
        flexDirection: 'row',
        alignItems: 'center'
    },
    detail: {
        marginHorizontal: 15,
        color: 'rgba(0, 0, 0, 0.5)',
        fontSize: 15
    },
    label: {
        flex: 1,
        marginLeft: 15,
        fontSize: 15,
        paddingVertical: 15
    },
    leftIcon: {
        width: 17
    }
});

function createTouchableComponent(children, action) {
    return (
        <TouchableHighlight onPress={action}>
            {children}
        </TouchableHighlight>
    );
}

function channelInfoRow(props) {
    const {action, defaultMessage, detail, icon, iconColor, textColor, textId, togglable, shouldRender = true} = props;

    if (!shouldRender) {
        return null;
    }
    const RowComponent = (
        <View style={style.container}>
            <Icon
                name={icon}
                size={15}
                color={iconColor}
                style={style.leftIcon}
            />
            <FormattedText
                style={[style.label, {color: textColor}]}
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
                    name='chevron-right'
                    size={15}
                    color='rgba(0, 0, 0, 0.7)'
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
        PropTypes.bool
    ]),
    icon: PropTypes.string.isRequired,
    iconColor: PropTypes.string,
    textId: PropTypes.string.isRequired,
    togglable: PropTypes.bool,
    textColor: PropTypes.string
};

channelInfoRow.defaultProps = {
    iconColor: 'rgba(0, 0, 0, 0.7)',
    textColor: '#000',
    togglable: false
};

export default channelInfoRow;
