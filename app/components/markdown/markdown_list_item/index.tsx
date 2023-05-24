// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ReactNode} from 'react';
import {StyleSheet, Text, type TextStyle, View} from 'react-native';

type MarkdownListItemProps = {
    bulletStyle: TextStyle;
    bulletWidth: number;
    children: ReactNode | ReactNode[];
    continue: boolean;
    index: number;
    ordered: boolean;
    level: number;
}

const style = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    bullet: {
        alignItems: 'flex-end',
        marginRight: 5,
    },
    contents: {
        flex: 1,
    },
});

const MarkdownListItem = ({index, level, bulletWidth, bulletStyle, children, continue: doContinue, ordered}: MarkdownListItemProps) => {
    let bullet;
    if (doContinue) {
        bullet = '';
    } else if (ordered) {
        bullet = index + '.';
    } else if (level % 2 === 0) {
        bullet = '◦';
    } else {
        bullet = '•';
    }

    return (
        <View
            style={style.container}
            testID='markdown_list_item'
        >
            <View style={[{width: bulletWidth}, style.bullet]}>
                <Text
                    style={bulletStyle}
                    testID='markdown_list_item.bullet'
                >
                    {bullet}
                </Text>
            </View>
            <View style={style.contents}>
                {children}
            </View>
        </View>
    );
};

export default MarkdownListItem;
