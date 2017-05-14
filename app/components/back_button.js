// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {Platform, TouchableOpacity} from 'react-native';

import FontIcon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

export default class BackButton extends PureComponent {
    static propTypes = {
        color: PropTypes.string,
        onPress: PropTypes.func.isRequired,
        style: PropTypes.object
    };

    render() {
        const {color, onPress, style} = this.props;
        let icon;
        if (Platform.OS === 'ios') {
            icon = (
                <FontIcon
                    style={{fontWeight: 'bold'}}
                    name='angle-left'
                    size={35}
                    color={color}
                />
            );
        } else {
            icon = (
                <MaterialIcon
                    name='arrow-back'
                    size={30}
                    color={color}
                />
            );
        }

        return (
            <TouchableOpacity
                style={style}
                onPress={onPress}
            >
                {icon}
            </TouchableOpacity>
        );
    }
}
