// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getDistanceBW2Points, getNearestPoint} from './opengraph';

describe('Utility Functions', () => {
    describe('getDistanceBW2Points', () => {
        test('calculates the distance correctly', () => {
            const point1 = {x: 1, y: 1};
            const point2 = {x: 4, y: 5};
            const distance = getDistanceBW2Points(point1, point2);
            expect(distance).toBeCloseTo(5);
        });

        test('calculates the distance correctly with custom attributes', () => {
            const point1 = {a: 1, b: 1};
            const point2 = {a: 4, b: 5};
            const distance = getDistanceBW2Points(point1, point2, 'a', 'b');
            expect(distance).toBeCloseTo(5);
        });
    });

    describe('getNearestPoint', () => {
        test('finds the nearest point correctly', () => {
            const pivotPoint = {height: 0, width: 0};
            const points = [
                {x: 1, y: 1},
                {x: 2, y: 2},
                {x: -1, y: -1},
            ] as never[];
            const nearestPoint = getNearestPoint(pivotPoint, points);
            expect(nearestPoint).toEqual({x: 1, y: 1});
        });

        test('returns an empty object if points array is empty', () => {
            const pivotPoint = {height: 0, width: 0};
            const points: never[] = [];
            const nearestPoint = getNearestPoint(pivotPoint, points);
            expect(nearestPoint).toEqual({});
        });

        test('finds the nearest point with custom attributes', () => {
            const pivotPoint = {height: 0, width: 0};
            const points = [
                {a: 1, b: 1},
                {a: 2, b: 2},
                {a: -1, b: -1},
            ] as never[];
            const nearestPoint = getNearestPoint(pivotPoint, points, 'a', 'b');
            expect(nearestPoint).toEqual({a: 1, b: 1});
        });

        test('updates nearest point based on distance comparison', () => {
            const pivotPoint = {height: 0, width: 0};
            const points = [
                {x: 5, y: 5},
                {x: 2, y: 2},
                {x: 3, y: 3},
            ] as never[];
            const nearestPoint = getNearestPoint(pivotPoint, points);
            expect(nearestPoint).toEqual({x: 2, y: 2});
        });
    });
});
