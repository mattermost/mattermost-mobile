// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, ScrollView, Text} from 'react-native';
import {TextInput} from 'react-native-gesture-handler';
import {createStyleObject} from 'react-syntax-highlighter/create-element';

import {changeOpacity} from '@utils/theme';

type Props = {
    rows: any[];
    stylesheet: any;
    defaultColor: string;
    fontFamily: string;
    fontSize?: number;
    digits: number;
    selectable?: boolean;
    selectionColor?: string;
};

function createNativeElement({node, stylesheet, key, defaultColor, fontFamily, fontSize = 12, digits}: any): any {
    const {properties, type, tagName, value} = node;
    const startingStyle = {fontFamily, fontSize};

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
        return value;
    } else if (tagName) {
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

        const children = node.children.map((child: any, i: number) =>
            createNativeElement({
                node: child,
                stylesheet,
                key: `${key}-${i}`,
                defaultColor: style.color || defaultColor,
                fontSize,
                fontFamily,
                digits,
            }),
        );

        return (
            <Text
                key={key}
                style={style}
            >
                {children}
            </Text>
        );
    }

    return null;
}

const CodeHighlightRenderer = ({
    defaultColor,
    digits,
    fontFamily,
    fontSize = 12,
    rows,
    selectable,
    selectionColor,
    stylesheet,
}: Props) => {
    const content = rows.map((row, index) => {
        const elements = createNativeElement({
            node: row,
            stylesheet,
            key: `row-${index}`,
            defaultColor,
            fontSize,
            fontFamily,
            digits,
        });

        return [
            elements,
            index < rows.length - 1 ? '\n' : null,
        ];
    });

    let component: React.ReactNode;
    if (Platform.OS === 'android') {
        component = (
            <Text
                selectable={selectable}
                selectionColor={selectionColor}
                style={{fontFamily, fontSize, color: defaultColor}}
            >
                {content}
            </Text>
        );
    } else {
        component = (
            <TextInput
                style={{
                    fontFamily,
                    fontSize,
                    color: defaultColor,
                    padding: 5,
                    width: '200%',
                    flexGrow: 1,
                }}
                multiline={true}
                editable={false}
                selectionColor={selectionColor}
                enabled={selectable}
            >
                {content}
            </TextInput>
        );
    }

    return (
        <ScrollView
            horizontal={true}
            nestedScrollEnabled={true}
            contentContainerStyle={{width: '200%'}}
            style={{width: '200%'}}
        >
            {component}
        </ScrollView>
    );
};

export default CodeHighlightRenderer;
