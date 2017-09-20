// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {Text} from 'react-native';
import IonIcon from 'react-native-vector-icons/Ionicons';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import FoundationIcon from 'react-native-vector-icons/Foundation';

export default function vectorIcon(props) {
    const {name, type, style, size} = props;

    switch (type) {
    case 'fontawesome':
        return (
            <FontAwesomeIcon
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

vectorIcon.propTypes = {
    name: PropTypes.string,
    type: PropTypes.string,
    size: PropTypes.number,
    style: Text.propTypes.style
};

vectorIcon.defaultProps = {
    size: 14
};
