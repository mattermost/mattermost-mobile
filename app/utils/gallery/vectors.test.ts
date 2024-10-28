// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    create,
    add,
    sub,
    divide,
    multiply,
    invert,
    set,
    min,
    max,
    clamp,
    eq,
    useSharedVector,
} from './vectors';

// Mock the useSharedValue from react-native-reanimated
jest.mock('react-native-reanimated', () => ({
    useSharedValue: jest.fn((initialValue) => ({
        value: initialValue,
    })),
}));

describe('Vector operations', () => {
    describe('create', () => {
        it('should create a vector with given x and y', () => {
            const vector = create(10, 20);
            expect(vector).toEqual({x: 10, y: 20});
        });
    });

    describe('useSharedVector', () => {
        it('should create a shared vector with given x and y', () => {
            const vector = useSharedVector(10, 20);
            expect(vector.x.value).toBe(10);
            expect(vector.y.value).toBe(20);
        });

        it('should use the same value for x and y if y is not provided', () => {
            const vector = useSharedVector(15);
            expect(vector.x.value).toBe(15);
            expect(vector.y.value).toBe(15);
        });
    });

    describe('add', () => {
        it('should add multiple vectors together', () => {
            const v1 = create(10, 20);
            const v2 = create(30, 40);
            const result = add(v1, v2);
            expect(result).toEqual({x: 40, y: 60});
        });
    });

    describe('sub', () => {
        it('should subtract multiple vectors', () => {
            const v1 = create(30, 40);
            const v2 = create(10, 20);
            const result = sub(v1, v2);
            expect(result).toEqual({x: 20, y: 20});
        });
    });

    describe('multiply', () => {
        it('should multiply multiple vectors', () => {
            const v1 = create(10, 20);
            const v2 = create(2, 3);
            const result = multiply(v1, v2);
            expect(result).toEqual({x: 20, y: 60});
        });
    });

    describe('divide', () => {
        it('should divide multiple vectors', () => {
            const v1 = create(20, 40);
            const v2 = create(2, 4);
            const result = divide(v1, v2);
            expect(result).toEqual({x: 10, y: 10});
        });

        it('should return 0 when dividing by zero', () => {
            const v1 = create(20, 40);
            const v2 = create(0, 0);
            const result = divide(v1, v2);
            expect(result).toEqual({x: 0, y: 0});
        });
    });

    describe('invert', () => {
        it('should invert the vector', () => {
            const v = create(10, -20);
            const result = invert(v);
            expect(result).toEqual({x: -10, y: 20});
        });
    });

    describe('set', () => {
        it('should set vector values using another vector', () => {
            const vector = useSharedVector(0, 0);
            const newValue = create(10, 20);
            set(vector, newValue);
            expect(vector.x.value).toBe(10);
            expect(vector.y.value).toBe(20);
        });

        it('should set vector values using a callback function', () => {
            const vector = useSharedVector(0, 0);
            const callback = () => 5;
            set(vector, callback);
            expect(vector.x.value).toBe(5);
            expect(vector.y.value).toBe(5);
        });

        it('should set vector values using shared values', () => {
            const vector = useSharedVector(0, 0);
            const sharedValue = 10;
            set(vector, sharedValue);
            expect(vector.x.value).toBe(10);
            expect(vector.y.value).toBe(10);
        });
    });

    describe('min', () => {
        it('should return the minimum of multiple vectors', () => {
            const v1 = create(10, 20);
            const v2 = create(30, 5);
            const result = min(v1, v2);
            expect(result).toEqual({x: 10, y: 5});
        });
    });

    describe('max', () => {
        it('should return the maximum of multiple vectors', () => {
            const v1 = create(10, 20);
            const v2 = create(30, 5);
            const result = max(v1, v2);
            expect(result).toEqual({x: 30, y: 20});
        });
    });

    describe('clamp', () => {
        it('should clamp vector within given bounds', () => {
            const value = create(15, 5);
            const lower = create(10, 10);
            const upper = create(20, 20);
            const result = clamp(value, lower, upper);
            expect(result).toEqual({x: 15, y: 10});
        });
    });

    describe('eq', () => {
        it('should return true if vectors are equal', () => {
            const v1 = create(10, 20);
            const v2 = create(10, 20);
            expect(eq(v1, v2)).toBe(true);
        });

        it('should return false if vectors are not equal', () => {
            const v1 = create(10, 20);
            const v2 = create(20, 10);
            expect(eq(v1, v2)).toBe(false);
        });
    });
});
