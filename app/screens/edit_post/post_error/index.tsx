// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, useWindowDimensions, View} from 'react-native';

import ErrorText from '@components/error_text';
import {useTheme} from '@context/theme';

type PostErrorProps = {
    errorLine?: string;
    errorExtra?: string;
}

const styles = StyleSheet.create({
    errorContainerSplit: {
        paddingHorizontal: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    errorContainer: {
        paddingHorizontal: 10,
    },
    errorWrap: {
        flexShrink: 1,
        paddingRight: 20,
    },
});

const PostError = ({errorLine, errorExtra}: PostErrorProps) => {
    const theme = useTheme();
    const {width} = useWindowDimensions();

    return (
        <View
            style={[
                errorExtra ? styles.errorContainerSplit : styles.errorContainer,
                {width},
            ]}
        >
            {errorLine && (
                <ErrorText
                    testID='edit_post.error.text'
                    error={errorLine}
                    textStyle={styles.errorWrap}
                    theme={theme}
                />
            )}
            {errorExtra && (
                <ErrorText
                    testID='edit_post.error.text.extra'
                    error={errorExtra}
                    theme={theme}
                />
            )}
        </View>
    );
};

export default PostError;
