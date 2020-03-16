// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable
no-magic-numbers */

import {StyleSheet} from 'react-native';

export const GlobalStyles = StyleSheet.create({
    container: {
        flex: 1,
    },
    innerContainer: {
        flex: 1,
        alignItems: 'center',
        flexDirection: 'column',
        justifyContent: 'center',
        paddingHorizontal: 15,
    },
    whiteContainer: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
    },
    authContainer: {
        paddingRight: 15,
        paddingLeft: 15,
    },
    pagePush: {
        height: 50,
    },
    header: {
        textAlign: 'center',
        marginTop: 32,
        marginBottom: 32,
        fontSize: 24,
        lineHeight: 28,
        fontWeight: '500',
    },
    subheader: {
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '300',
        marginBottom: 32,
        lineHeight: 22,
    },
    authButton: {
        borderRadius: 3,
        alignItems: 'center',
        alignSelf: 'stretch',
        marginBottom: 16,
        padding: 15,
    },
    authButtonText: {
        textAlign: 'center',
        fontSize: 17,
        fontWeight: '500',
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
    label: {
        fontSize: 20,
        fontWeight: '400',
    },
    errorLabel: {
        color: 'red',
        marginTop: 12,
        marginBottom: 12,
        fontSize: 14,
        textAlign: 'left',
        lineHeight: 20,
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
        paddingLeft: 10,
        alignSelf: 'stretch',
        borderRadius: 4,
    },
    inputBoxBlur: {
        borderWidth: 1,
    },
    inputBoxDisabled: {
        borderWidth: 0,
    },
    inputBoxError: {
        borderWidth: 2,
    },
    inputBoxFocused: {
        borderWidth: 2,
    },
});
