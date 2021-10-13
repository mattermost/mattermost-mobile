// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * This file is written in JavaScript instead of TypeScript because
 * the Text component does not have a definition for the render method
 * and we need to monkey patch it in order to set the default text style
 * without having to create a custom Text component
 */

import {cloneElement} from 'react';
import {StyleSheet, Text} from 'react-native';

const setFontFamily = () => {
    const styles = StyleSheet.create({
        defaultText: {
            fontFamily: 'OpenSans',
            fontSize: 16,
        },
    });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const oldRender = Text.render;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    Text.render = function render(...args) {
        const origin = oldRender.call(this, ...args);
        return cloneElement(origin, {
            style: [styles.defaultText, origin.props.style],
        });
    };
};

export default setFontFamily;
