// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const style = StyleSheet.create({
    buttonContainer: {
        width: 25,
        height: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttons: {
        marginHorizontal: 15,
    },
    container: {
        alignSelf: 'stretch',
        paddingHorizontal: 15,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    message: {
        flex: 1,
        color: '#fff',
    },
});

function GeneralError(props) {
    const {error, dismiss} = props;
    let message = error.message;
    if (!message) {
        if (error instanceof Error) {
            message = error.toString();
        } else {
            message = 'An error occurred.';
        }
    }

    return (
        <View style={style.container}>
            <Text style={style.message}>
                {error.message}
            </Text>
            <TouchableOpacity
                style={style.buttonContainer}
                onPress={dismiss}
            >
                <Icon
                    name='close'
                    size={20}
                    color='#fff'
                />
            </TouchableOpacity>
        </View>
    );
}

GeneralError.propTypes = {
    dismiss: PropTypes.func.isRequired,
    error: PropTypes.object.isRequired,
};

export default GeneralError;
