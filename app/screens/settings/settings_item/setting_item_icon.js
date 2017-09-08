// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import IonIcon from 'react-native-vector-icons/Ionicons';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import FoundationIcon from 'react-native-vector-icons/Foundation';

export default function settingsItemIcon(props) {
    const {name, type, style} = props;

    switch (type) {
    case 'fontawesome':
        return (
            <FontAwesomeIcon
                name={name}
                style={style}
            />
        );
    case 'foundation':
        return (
            <FoundationIcon
                name={name}
                style={style}
            />
        );
    case 'ion':
        return (
            <IonIcon
                name={name}
                style={style}
            />
        );
    case 'material':
        return (
            <MaterialIcon
                name={name}
                style={style}
            />
        );
    }

    return null;
}

settingsItemIcon.propTypes = {
    name: PropTypes.string,
    type: PropTypes.string,
    style: PropTypes.oneOfType([PropTypes.object, PropTypes.array])
};
