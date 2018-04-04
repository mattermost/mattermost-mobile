// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Platform, StyleSheet, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default class FileUploadRemove extends PureComponent {
    static propTypes = {
        channelId: PropTypes.string,
        clientId: PropTypes.string,
        onPress: PropTypes.func.isRequired,
        rootId: PropTypes.string,
    };

    handleOnPress = () => {
        const {channelId, clientId, onPress, rootId} = this.props;

        onPress(clientId, channelId, rootId);
    };

    render() {
        return (
            <TouchableOpacity
                style={style.removeButtonWrapper}
                onPress={this.handleOnPress}
            >
                <Icon
                    name='md-close'
                    color='#fff'
                    size={18}
                    style={style.removeButtonIcon}
                />
            </TouchableOpacity>
        );
    }
}

const style = StyleSheet.create({
    removeButtonIcon: Platform.select({
        ios: {
            marginTop: 2,
        },
        android: {
            marginLeft: 1,
        },
    }),
    removeButtonWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        overflow: 'hidden',
        elevation: 11,
        top: 7,
        right: 7,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#000',
        borderWidth: 1,
        borderColor: '#fff',
    },
});
