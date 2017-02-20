// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes} from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        container: {
            flexDirection: 'column',
            height: 65,
            paddingHorizontal: 15,
            justifyContent: 'center',
            backgroundColor: theme.centerChannelBg
        },
        titleContainer: {
            alignItems: 'center',
            flexDirection: 'row'
        },
        displayName: {
            fontSize: 16,
            color: theme.centerChannelColor
        },
        icon: {
            fontSize: 16,
            color: theme.centerChannelColor
        },
        textContainer: {
            flex: 1,
            flexDirection: 'row',
            marginLeft: 5
        },
        purpose: {
            fontSize: 13,
            color: changeOpacity(theme.centerChannelColor, 0.5)
        },
        selector: {
            height: 28,
            width: 28,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#888',
            alignItems: 'center',
            justifyContent: 'center'
        },
        selectorContainer: {
            height: 50,
            paddingRight: 15,
            alignItems: 'center',
            justifyContent: 'center'
        },
        selectorFilled: {
            backgroundColor: '#378FD2',
            borderWidth: 0
        }
    });
});

function createTouchableComponent(children, action) {
    return (
        <TouchableOpacity onPress={action}>
            {children}
        </TouchableOpacity>
    );
}

function ChannelListRow(props) {
    const {id, displayName, purpose, onPress, theme} = props;
    const style = getStyleFromTheme(theme);

    const RowComponent = (
        <View style={style.container}>
            <View style={style.titleContainer}>
                {props.selectable &&
                <TouchableWithoutFeedback onPress={props.onRowSelect}>
                    <View style={style.selectorContainer}>
                        <View style={[style.selector, (props.selected && style.selectorFilled)]}>
                            {props.selected &&
                            <Icon
                                name='check'
                                size={16}
                                color='#fff'
                            />
                            }
                        </View>
                    </View>
                </TouchableWithoutFeedback>
                }
                <Icon
                    name='globe'
                    style={style.icon}
                />
                <View style={style.textContainer}>
                    <View style={{flexGrow: 1, flexDirection: 'column'}}>
                        <Text style={style.displayName}>
                            {displayName}
                        </Text>
                    </View>
                </View>
            </View>
            <View style={{flexShrink: 1, flexDirection: 'column', flexWrap: 'wrap'}}>
                <Text
                    style={style.purpose}
                    ellipsizeMode='tail'
                    numberOfLines={1}
                >
                    {purpose}
                </Text>
            </View>
        </View>
    );

    if (typeof onPress === 'function') {
        return createTouchableComponent(RowComponent, () => onPress(id));
    }

    return RowComponent;
}

ChannelListRow.propTypes = {
    id: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    purpose: PropTypes.string.isRequired,
    theme: PropTypes.object.isRequired,
    onPress: PropTypes.func,
    selectable: PropTypes.bool,
    onRowSelect: PropTypes.func,
    selected: PropTypes.bool
};

export default ChannelListRow;
