// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';

import ErrorText from '@components/error_text';
import MenuDivider from '@components/menu_divider';

type PostErrorProps = {
    errorLine?: string;
    errorExtra?: string;
}

const styles = StyleSheet.create({
    errorContainerSplit: {
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    errorContainer: {
        paddingHorizontal: 16,
        width: '100%',
    },
    errorWrap: {
        flexShrink: 1,
        paddingRight: 20,
    },
    errorWrapper: {
        alignItems: 'center',
    },
    errorText: {
        fontSize: 13,
    },
});

const PostError = ({errorLine, errorExtra}: PostErrorProps) => {
    const hasError = Boolean(errorLine || errorExtra);

    if (!hasError) {
        return null;
    }

    return (
        <>
            <View
                style={errorExtra ? styles.errorContainerSplit : styles.errorContainer}
            >
                {Boolean(errorLine) && (
                    <ErrorText
                        testID='edit_post.message.input.error'
                        error={errorLine!}
                        textStyle={[styles.errorWrap, styles.errorText]}
                    />
                )}
                {Boolean(errorExtra) && (
                    <ErrorText
                        testID='edit_post.message.input.error.extra'
                        error={errorExtra!}
                        textStyle={[!errorLine && styles.errorWrapper, styles.errorText]}
                    />
                )}
            </View>
            <MenuDivider
                marginTop={0}
                marginBottom={0}
                marginLeft={0}
                marginRight={0}
            />
        </>
    );
};

export default PostError;
