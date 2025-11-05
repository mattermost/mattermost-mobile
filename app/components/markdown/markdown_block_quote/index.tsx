// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ReactNode} from 'react';
import {type StyleProp, StyleSheet, type TextStyle, View, type ViewStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';

type MarkdownBlockQuoteProps = {
    continueBlock?: boolean;
    iconStyle: StyleProp<Intersection<ViewStyle, TextStyle>>;
    children: ReactNode | ReactNode[];
};

const style = StyleSheet.create({
    container: {
        alignItems: 'flex-start',
        flexDirection: 'row',
        alignSelf: 'flex-start',
        flexShrink: 1,
        maxWidth: '100%',
    },
    childContainer: {
        flexShrink: 1,
        minWidth: 0,
    },
    icon: {
        width: 23,
        flexShrink: 0,
    },
});

const MarkdownBlockQuote = ({children, continueBlock, iconStyle}: MarkdownBlockQuoteProps) => {
    return (
        <View
            style={style.container}
            testID='markdown_block_quote'
        >
            {!continueBlock && (
                <View style={style.icon}>
                    <CompassIcon
                        name='format-quote-open'
                        style={iconStyle}
                        size={20}
                    />
                </View>
            )}
            <View style={style.childContainer}>{children}</View>
        </View>
    );
};

export default MarkdownBlockQuote;
