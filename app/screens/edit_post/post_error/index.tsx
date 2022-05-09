// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';

import ErrorText from '@components/error_text';

type PostErrorProps = {
    errorLine?: string;
    errorExtra?: string;
}

const styles = StyleSheet.create({
    errorContainerSplit: {
        paddingHorizontal: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    errorContainer: {
        paddingHorizontal: 10,
        width: '100%',
    },
    errorWrap: {
        flexShrink: 1,
        paddingRight: 20,
    },
    errorWrapper: {
        alignItems: 'center',
    },
});

const PostError = ({errorLine, errorExtra}: PostErrorProps) => {
    return (
        <View
            style={errorExtra ? styles.errorContainerSplit : styles.errorContainer}
        >
            {Boolean(errorLine) && (
                <ErrorText
                    testID='edit_post.message.input.error'
                    error={errorLine!}
                    textStyle={styles.errorWrap}
                />
            )}
            {Boolean(errorExtra) && (
                <ErrorText
                    testID='edit_post.message.input.error.extra'
                    error={errorExtra!}
                    textStyle={!errorLine && styles.errorWrapper}
                />
            )}
        </View>
    );
};

export default PostError;
