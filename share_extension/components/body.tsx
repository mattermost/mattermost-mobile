// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable react/prop-types */
// React prop validations are not recognized with forwardRef

import React, {forwardRef, useCallback, useImperativeHandle, useRef, useState} from 'react';
import {ScrollView, StyleSheet, TextInput} from 'react-native';

import {Preferences} from '@mm-redux/constants';
import {changeOpacity} from '@utils/theme';

import CharsRemaining from './chars_remaining';
import Files from './files';

export interface BodyProps {
    canPost: (error?: string, text?: string, extensionFiles?: ShareFileInfo[], calculatedSize?: number) => void;
    files: ShareFileInfo[];
    initialValue?: string;
    placeholder: string;
}

const INPUT_HEIGHT = 150;
const theme = Preferences.THEMES.denim;

const Body = forwardRef<BodyRef, BodyProps>(({canPost, files, initialValue, placeholder}: BodyProps, ref) => {
    const scrollViewRef = useRef<ScrollView>(null);
    const inputRef = useRef<TextInput>(null);
    const [value, setValue] = useState(initialValue);

    const getValue = () => {
        return value?.trim();
    };

    const handleBlur = useCallback(() => {
        inputRef.current?.setNativeProps({
            autoScroll: false,
        });
    }, []);

    const handleFocus = useCallback(() => {
        inputRef.current?.setNativeProps({
            autoScroll: true,
        });
    }, []);

    const handleTextChange = useCallback((text) => {
        canPost(undefined, text);
        setValue(text);
    }, []);

    useImperativeHandle(ref, () => ({
        getValue,
    }));

    return (
        <>
            <ScrollView
                contentContainerStyle={styles.scrollView}
                ref={scrollViewRef}
                style={styles.flex}
            >
                <TextInput
                    allowFontScaling={true}
                    ref={inputRef}
                    autoCapitalize='sentences'
                    autoCompleteType='off'
                    multiline={true}
                    onBlur={handleBlur}
                    onChangeText={handleTextChange}
                    onFocus={handleFocus}
                    placeholder={placeholder}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    style={styles.input}
                    underlineColorAndroid='transparent'
                    value={value}
                />
                <Files files={files}/>
            </ScrollView>
            <CharsRemaining text={value}/>
        </>
    );
});

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    input: {
        flex: 1,
        color: theme.centerChannelColor,
        fontSize: 17,
        height: INPUT_HEIGHT,
        marginBottom: 5,
        textAlignVertical: 'top',
        width: '100%',
    },
    scrollView: {
        flex: 1,
        padding: 15,
    },
});

Body.displayName = 'Body';

export default Body;
