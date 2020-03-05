// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import TouchableWithFeedback from 'app/components/touchable_with_feedback';

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
            <TouchableWithFeedback
                style={style.failed}
                onPress={this.handleOnPress}
                type={'opacity'}
            >
                <Icon
                    name='md-refresh'
                    size={25}
                    color='#fff'
                />
            </TouchableWithFeedback>
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
        borderRadius: 4,
    },
});
