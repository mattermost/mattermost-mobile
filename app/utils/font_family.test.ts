// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {cloneElement} from 'react';
import {Text, StyleSheet} from 'react-native';

import setFontFamily from './font_family';

// Type for style object
type StyleObject = { [key: string]: any };

// Custom function to flatten styles
const flattenStyles = (styles: StyleObject | Array<StyleObject | StyleObject[]>): StyleObject|undefined => {
    if (styles === null || typeof styles !== 'object') {
        return undefined;
    }

    if (!Array.isArray(styles)) {
        return styles;
    }

    return styles.reduce((acc, style) => {
        if (!style) {
            return acc;
        } // Skip if style is null or undefined

        if (Array.isArray(style)) {
            // Merge arrays of styles
            return style.reduce((prev, curr) => ({
                ...prev,
                ...flattenStyles(curr),
            }), acc);
        } else if (typeof style === 'object') {
            // Merge objects of styles
            return {...acc, ...style};
        }

        // Skip if style is not an object or array
        return acc;
    }, {});
};

// Mock cloneElement
jest.mock('react', () => ({
    ...jest.requireActual('react'),
    cloneElement: jest.fn((element, props) => {
        // Merge the existing style with the new style
        const mergedStyle = flattenStyles([props.style, ...(element.props.style ? [element.props.style] : [])]);

        // Return a new object with merged styles
        return {
            ...element,
            props: {
                ...element.props,
                style: mergedStyle,
            },
        };
    }),
}));

describe('setFontFamily', () => {
    // @ts-expect-error renderer is not exposed to TS definition
    const renderTextSpy = jest.spyOn(Text, 'render');
    let originalTextRender: any;

    beforeEach(() => {
        // Capture the original Text.render before modification
        // @ts-expect-error renderer is not exposed to TS definition
        originalTextRender = Text.render;
    });

    // Restore the original implementations after each test
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('overrides Text.render and applies custom styles', () => {
        const createSpy = jest.spyOn(StyleSheet, 'create');

        // Call the function to set the font family
        setFontFamily();

        // Check if the StyleSheet.create was called with the correct styles
        expect(createSpy).toHaveBeenCalledWith({
            defaultText: {
                fontFamily: 'OpenSans',
                fontSize: 16,
            },
        });

        // Check if Text.render was overridden
        // @ts-expect-error renderer is not exposed to TS definition
        expect(Text.render).not.toBe(originalTextRender);

        // Create a mock origin render output
        const mockOriginRenderOutput = {
            props: {
                style: [{color: 'red'}],
            },
        };

        // Set the old render function to return the mock output
        renderTextSpy.mockReturnValue(mockOriginRenderOutput as any);

        // Call the new render function
        // @ts-expect-error renderer is not exposed to TS definition
        const newRenderOutput = Text.render();

        // Check if cloneElement was called with the correct arguments
        expect(cloneElement).toHaveBeenCalledWith(mockOriginRenderOutput, {
            style: [
                {
                    fontFamily: 'OpenSans',
                    fontSize: 16,
                },
                [{color: 'red'}],
            ],
        });

        // Verify the new render output has the expected styles
        expect(newRenderOutput.props.style).toEqual({fontFamily: 'OpenSans', fontSize: 16, color: 'red'});
    });
});
