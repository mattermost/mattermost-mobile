// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {StyleSheet, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default class FileUploadRetry extends PureComponent {
    static propTypes = {
        file: PropTypes.object.isRequired,
        onPress: PropTypes.func.isRequired,
    };

    handleOnPress = () => {
        const {file, onPress} = this.props;

        onPress(file);
    };

    render() {
        return (
            <TouchableOpacity
                style={style.failed}
                onPress={this.handleOnPress}
            >
                <Icon
                    name='md-refresh'
                    size={50}
                    color='#fff'
                />
            </TouchableOpacity>
        );
    }
}

const style = StyleSheet.create({
    failed: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        position: 'absolute',
        height: '100%',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
