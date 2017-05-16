// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import ProfilePicture from 'app/components/profile_picture';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';

function createTouchableComponent(children, action) {
    return (
        <TouchableOpacity onPress={action}>
            {children}
        </TouchableOpacity>
    );
}

function MemberListRow(props) {
    const {id, displayName, username, onPress, theme, user, disableSelect} = props;
    const style = getStyleFromTheme(theme);

    const RowComponent = (
        <View style={style.container}>
            {props.selectable &&
                <TouchableWithoutFeedback onPress={disableSelect ? () => false : props.onRowSelect}>
                    <View style={style.selectorContainer}>
                        <View style={[style.selector, (props.selected && style.selectorFilled), (disableSelect && style.selectorDisabled)]}>
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
            <ProfilePicture
                user={user}
                size={32}
            />
            <View style={style.textContainer}>
                <View style={{flexDirection: 'column'}}>
                    <Text style={style.displayName}>
                        {displayName}
                    </Text>
                </View>
                <View style={{flexShrink: 1, flexDirection: 'column', flexWrap: 'wrap'}}>
                    <Text
                        style={style.username}
                        ellipsizeMode='tail'
                        numberOfLines={1}
                    >
                        {`(@${username})`}
                    </Text>
                </View>
            </View>
        </View>
    );

    if (typeof onPress === 'function') {
        return createTouchableComponent(RowComponent, () => onPress(id));
    } else if (typeof props.onRowSelect === 'function') {
        return createTouchableComponent(RowComponent, disableSelect ? () => false : props.onRowSelect);
    }

    return RowComponent;
}

MemberListRow.propTypes = {
    id: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    pictureURL: PropTypes.string,
    username: PropTypes.string.isRequired,
    theme: PropTypes.object.isRequired,
    onPress: PropTypes.func,
    selectable: PropTypes.bool,
    onRowSelect: PropTypes.func,
    selected: PropTypes.bool,
    disableSelect: PropTypes.bool
};

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        container: {
            flexDirection: 'row',
            height: 65,
            paddingHorizontal: 15,
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg
        },
        displayName: {
            fontSize: 15,
            color: theme.centerChannelColor
        },
        icon: {
            fontSize: 20,
            color: theme.centerChannelColor
        },
        textContainer: {
            flexDirection: 'row',
            marginLeft: 5
        },
        username: {
            marginLeft: 5,
            fontSize: 15,
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
        selectorDisabled: {
            backgroundColor: '#888'
        },
        selectorFilled: {
            backgroundColor: '#378FD2',
            borderWidth: 0
        }
    });
});

export default MemberListRow;
