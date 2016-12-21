// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

/* eslint-disable
  no-magic-numbers */

import {StyleSheet} from 'react-native';

export const GlobalStyles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white'
    },
    logo: {
        marginBottom: 10
    },
    header: {
        fontSize: 36,
        fontWeight: '600'
    },
    subheader: {
        fontSize: 18,
        fontWeight: '300',
        color: '#777'
    },
    buttonListItemText: {
        textAlign: 'left',
        fontSize: 18,
        fontWeight: '400',
        color: '#777'
    },
    buttonListItem: {
        alignSelf: 'stretch',
        height: 50,
        marginHorizontal: 15,
        marginVertical: 5,
        padding: 13,
        backgroundColor: '#fafafa',
        borderWidth: 1,
        borderRadius: 3,
        borderColor: '#d5d5d5'
    },
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
