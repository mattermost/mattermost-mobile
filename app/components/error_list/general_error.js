// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes} from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const style = StyleSheet.create({
    buttonContainer: {
        width: 25,
        height: 25,
        alignItems: 'center',
        justifyContent: 'center'
    },
    buttons: {
        marginHorizontal: 15
    },
    container: {
        alignSelf: 'stretch',
        paddingHorizontal: 15,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center'
    },
    message: {
        flex: 1,
        color: '#fff'
    }
});

function GeneralError(props) {
    const {message, dismiss} = props;

    return (
        <View style={style.container}>
            <Text style={style.message}>{message}</Text>
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
    message: PropTypes.string.isRequired
};

export default GeneralError;
