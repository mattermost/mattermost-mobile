// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getLabelPositions} from './utils';

describe('getLabelPositions', () => {
    test('should return correct positions when all styles are provided', () => {
        const style = {
            paddingTop: 10,
            paddingBottom: 10,
            height: 50,
            fontSize: 14,
            padding: 20,
        };
        const labelStyle = {fontSize: 15};
        const smallLabelStyle = {fontSize: 11};

        const result = getLabelPositions(style, labelStyle, smallLabelStyle);
        expect(result).toEqual([24.4, -6.5]);
    });

    test('should return correct positions when label and smallLabels styles are missing', () => {
        const style = {
            paddingTop: 15,
            paddingBottom: 15,
            height: 50,
            fontSize: 14,
            padding: 25,
        };
        const labelStyle = {};
        const smallLabelStyle = {};

        const result = getLabelPositions(style, labelStyle, smallLabelStyle);
        expect(result).toEqual([23.8, -6.5]);
    });

    test('should return correct positions when all values are empty are provided', () => {
        const style = {};
        const labelStyle = {};
        const smallLabelStyle = {};

        const result = getLabelPositions(style, labelStyle, smallLabelStyle);
        expect(result[0]).toBeCloseTo(-1.8);
        expect(result[1]).toBeCloseTo(-6.5);
    });

    test('should return correct positions when all values are zero', () => {
        const style = {
            paddingTop: 0,
            paddingBottom: 0,
            height: 0,
            fontSize: 0,
            padding: 0,
        };
        const labelStyle = {fontSize: 0};
        const smallLabelStyle = {fontSize: 0};

        const result = getLabelPositions(style, labelStyle, smallLabelStyle);
        expect(result[0]).toBeCloseTo(-1.8);
        expect(result[1]).toBeCloseTo(-6.5);
    });
});
