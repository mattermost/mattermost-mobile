// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef} from 'react';
import {FlatList, type ListRenderItemInfo, ScrollView, StyleSheet, Text} from 'react-native';
import {createStyleObject} from 'react-syntax-highlighter/create-element';

import {generateId} from '@utils/general';
import {changeOpacity} from '@utils/theme';

type CreateChildren = {
    digits: number;
    stylesheet: any;
    fontFamily: string;
    fontSize?: number;
    selectable?: boolean;
}

type CreateNativeElement = CreateChildren & {
    node: any;
    key: string;
    defaultColor: string;
}

type Props = CreateChildren & Pick<CreateNativeElement, 'defaultColor'> & {
    rows: any[];
}

const styles = StyleSheet.create({
    wrapped: {
        flexWrap: 'nowrap',
    },
});

function createChildren({stylesheet, fontSize = 12, fontFamily, selectable, digits}: CreateChildren) {
    let childrenCount = 0;
    return (children: any[], defaultColor: string) => {
        childrenCount += 1;
        return children.map((child, i) => {
            return createNativeElement({
                node: child,
                stylesheet,
                key: `code-segment-${childrenCount}-${i}`,
                defaultColor,
                fontSize,
                fontFamily,
                selectable,
                digits,
            });
        });
    };
}

function createNativeElement({node, stylesheet, key, defaultColor, fontFamily, fontSize = 12, selectable, digits}: CreateNativeElement) {
    const {properties, type, tagName: TagName, value} = node;
    const startingStyle = {fontFamily, fontSize, height: fontSize + 7};
    if (properties?.key?.startsWith('line-number')) {
        let valueString = `${node.children[0].value}. `;
        for (let i = valueString.length; i < digits + 2; i++) {
            valueString += ' ';
        }

        return (
            <Text
                key={key}
                style={{color: changeOpacity(defaultColor, 0.75), paddingRight: 5, ...startingStyle}}
            >
                {valueString}
            </Text>
        );
    }
    if (type === 'text') {
        return (
            <Text
                key={key}
                style={Object.assign({color: defaultColor}, startingStyle)}
                selectable={selectable}
            >
                {value}
            </Text>
        );
    } else if (TagName) {
        const childrenCreator = createChildren({stylesheet, fontSize, fontFamily, digits});
        if (properties.style?.display) {
            properties.style.display = 'flex';
        }
        if (properties.style?.paddingRight) {
            delete properties.style.paddingRight;
        }
        if (properties.style?.userSelect) {
            delete properties.style.userSelect;
        }
        const style = createStyleObject(
            properties.className,
            {
                color: defaultColor,
                ...properties.style,
                ...startingStyle,
            },
            stylesheet,
        );
        const children = childrenCreator(node.children, style.color || defaultColor);
        return (
            <Text
                key={key}
                style={[style, styles.wrapped]}
                selectable={selectable}
            >
                {children}
            </Text>
        );
    }

    return null;
}

const CodeHighlightRenderer = ({defaultColor, digits, fontFamily, fontSize, rows, selectable, stylesheet}: Props) => {
    const listKey = useRef(generateId()).current;
    const renderItem = useCallback(({item, index}: ListRenderItemInfo<any>) => {
        return createNativeElement({
            node: item,
            stylesheet,
            key: `code-segment-${index}`,
            defaultColor,
            fontFamily,
            fontSize,
            selectable,
            digits,
        });
    }, [defaultColor, digits, fontFamily, fontSize, stylesheet]);

    return (
        <ScrollView
            horizontal={true}
            nestedScrollEnabled={true}
            showsHorizontalScrollIndicator={false}
        >
            <FlatList
                data={rows}
                renderItem={renderItem}

                //@ts-expect-error key not defined in types
                listKey={listKey}
            />
        </ScrollView>
    );
};

export default CodeHighlightRenderer;
