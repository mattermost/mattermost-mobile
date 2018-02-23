// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
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
        backgroundColor: 'white',
    },
    signupContainer: {
        paddingRight: 15,
        paddingLeft: 15,
    },
    pagePush: {
        height: 50,
    },
    header: {
        textAlign: 'center',
        marginTop: 15,
        marginBottom: 15,
        fontSize: 32,
        fontWeight: '600',
    },
    subheader: {
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '300',
        color: '#777',
        marginBottom: 15,
        lineHeight: 22,
    },
    signupButton: {
        borderRadius: 3,
        borderColor: '#2389D7',
        borderWidth: 1,
        alignItems: 'center',
        alignSelf: 'stretch',
        marginTop: 10,
        padding: 15,
    },
    signupButtonText: {
        textAlign: 'center',
        color: '#2389D7',
        fontSize: 17,
    },
    buttonListItemText: {
        textAlign: 'left',
        fontSize: 18,
        fontWeight: '400',
        color: '#777',
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
        borderColor: '#d5d5d5',
    },
    button: {
        margin: 3,
        paddingTop: 10,
        paddingBottom: 10,
        paddingLeft: 15,
        paddingRight: 15,
    },

    buttonText: {
        color: '#5890FF',
        fontSize: 18,
    },

    label: {
        fontSize: 20,
        fontWeight: '400',
    },

    errorLabel: {
        color: 'red',
        marginTop: 15,
        marginBottom: 15,
        fontSize: 12,
        textAlign: 'left',
    },

    switchUp: {
        padding: 0,
        backgroundColor: 'green',
        paddingBottom: 50,
        alignItems: 'center',
    },

    inputBox: {
        fontSize: 16,
        height: 45,
        borderColor: 'gainsboro',
        borderWidth: 1,
        marginTop: 5,
        marginBottom: 5,
        paddingLeft: 10,
        alignSelf: 'stretch',
        borderRadius: 3,
    },
});
