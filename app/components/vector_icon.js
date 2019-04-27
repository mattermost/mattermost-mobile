// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';
import {Text} from 'react-native';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';
import FontAwesome5Icon from 'react-native-vector-icons/FontAwesome5';
import FoundationIcon from 'react-native-vector-icons/Foundation';
import IonIcon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

export default class VectorIcon extends PureComponent {
    static propTypes = {
        name: PropTypes.string,
        type: PropTypes.string,
        size: PropTypes.number,
        style: Text.propTypes.style,
    };

    static defaultProps = {
        size: 14,
    };

    render() {
        const {name, type, style, size} = this.props;

        switch (type) {
        case 'fontawesome':
            return (
                <FontAwesomeIcon
                    name={name}
                    style={style}
                    size={size}
                />
            );
        case 'fontawesome5':
            return (
                <FontAwesome5Icon
                    name={name}
                    style={style}
                    size={size}
                />
            );
        case 'foundation':
            return (
                <FoundationIcon
                    name={name}
                    style={style}
                    size={size}
                />
            );
        case 'ion':
            return (
                <IonIcon
                    name={name}
                    style={style}
                    size={size}
                />
            );
        case 'material':
            return (
                <MaterialIcon
                    name={name}
                    style={style}
                    size={size}
                />
            );
        }

        return null;
    }
}
