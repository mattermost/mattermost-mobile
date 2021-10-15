// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {KeyboardTypeOptions, StyleSheet} from 'react-native';
import {HelperText, TextInput as PaperTextInput} from 'react-native-paper';
import {Colors} from 'react-native/Libraries/NewAppScreen';

import CompassIcon from '@components/compass_icon';
import {makeStyleSheetFromTheme} from '@utils/theme';

type TextInputFormattedProps = {
    editable?: boolean;
    error?: string;
    label?: string;
    keyboardType?: KeyboardTypeOptions;
    onChangeText?: (text: string) => void;
    onSubmitEditing?: any;
    testID: string;
    theme: any;
    value: string;
};

const TextInputFormatted = ({editable, error, keyboardType, label, onChangeText, onSubmitEditing, testID, theme, value, ...props}: TextInputFormattedProps) => {
    const styles = getStyleSheet(theme);
    const inputStyle = [styles.inputBox];
    if (!editable) {
        inputStyle.push(styles.disabledInput);
    }

    return (
        <>
            <PaperTextInput
                {...props}
                editable={editable}
                label={label}
                keyboardType={keyboardType}
                onChangeText={onChangeText}
                onSubmitEditing={onSubmitEditing}
                style={StyleSheet.flatten([inputStyle])}
                testID={testID}
                theme={theme}
                value={value}
            />
            {error && (
                <HelperText
                    type='error'
                    style={styles.errorHelper}
                >
                    <CompassIcon
                        name='alert-outline'
                    />
                    {' ' + error}
                </HelperText>
            )}
        </>
    );
};

const getStyleSheet = makeStyleSheetFromTheme(() => ({
    inputBox: {
        fontSize: 16,
        height: 48,
        flex: 0,
        alignSelf: 'stretch',
        backgroundColor: Colors.white,
        marginTop: 20,
        marginBottom: 0,
    },

    errorHelper: {
        width: 374,
        marginTop: 4,
        marginBottom: 0,
        padding: 0,
        flex: 0,
        fontFamily: 'Open Sans',
        fontStyle: 'normal',
        fontWeight: 'normal',
        fontSize: 12,
        alignItems: 'center',
        alignSelf: 'stretch',
    },
}));

TextInputFormatted.defaultProps = {
    autoCapitalize: 'none',
    autoCorrect: false,
    disableFullscreenUI: true,
    mode: 'outlined',
    returnKeyType: 'go',
    underlineColorAndroid: 'transparent',
};

export default TextInputFormatted;

