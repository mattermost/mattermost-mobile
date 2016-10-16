// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

/* eslint-disable
  no-magic-numbers */

import {StyleSheet} from 'react-native';

export const GlobalStyles = StyleSheet.create({
    button: {
        margin: 3,
        paddingTop: 10,
        paddingBottom: 10,
        paddingLeft: 15,
        paddingRight: 15
    },

    buttonText: {
        color: '#5890FF',
        fontSize: 18
    },

    label: {
        paddingTop: 5,
        paddingBottom: 5,
        fontSize: 18
    },

    errorLabel: {
        color: 'red',
        margin: 5,
        paddingTop: 5,
        paddingBottom: 5,
        fontSize: 11
    },

    inputBox: {
        fontSize: 18,
        height: 40,
        borderColor: 'gainsboro',
        borderWidth: 1,
        marginLeft: 15,
        marginRight: 15,
        marginTop: 5,
        marginBottom: 5,
        padding: 3,
        alignSelf: 'stretch',
        borderRadius: 3
    }
});