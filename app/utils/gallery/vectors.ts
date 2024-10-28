// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Animated, {useSharedValue} from 'react-native-reanimated';

type SharedValueType = number;

type Callback = () => unknown;

type VectorType = Vector<any> | SharedVector<any>;

type VectorList = Array<VectorType | SharedValueType>;

type Operation = 'divide' | 'add' | 'sub' | 'multiply';

type VectorProp = 'x' | 'y';

export type Vector<T extends SharedValueType> = {
    x: T;
    y: T;
};

export type SharedVector<T extends SharedValueType> = {
    x: Animated.SharedValue<T>;
    y: Animated.SharedValue<T>;
};

const isVector = (value: any): value is Vector<any> => {
    'worklet';

    return value.x !== undefined && value.y !== undefined;
};

const isSharedValue = (
    value: any,
): value is Animated.SharedValue<any> => {
    'worklet';

    return typeof value.value !== 'undefined';
};

const get = <T extends Animated.SharedValue<SharedValueType> | SharedValueType>(
    value: T,
) => {
    'worklet';

    if (isSharedValue(value)) {
        return value.value;
    }

    return value;
};

const reduce = (
    operation: Operation,
    prop: VectorProp,
    vectors: VectorList,
) => {
    'worklet';

    const first = vectors[0];
    const rest = vectors.slice(1);

    const initial = get(isVector(first) ? first[prop] : first);

    const res = rest.reduce((acc, current) => {
        const value = get(isVector(current) ? current[prop] : current);
        const r = (() => {
            switch (operation) {
                case 'divide':
                    if (value === 0) {
                        return 0;
                    }
                    return acc / value;
                case 'add':
                    return acc + value;
                case 'sub':
                    return acc - value;
                case 'multiply':
                    return acc * value;
                default:
                    return acc;
            }
        })();

        return r;
    }, initial);

    return res;
};

export const useSharedVector = <T>(x: T, y = x) => {
    return {
        x: useSharedValue(x),
        y: useSharedValue(y),
    };
};

export const create = <T extends SharedValueType>(x: T, y: T) => {
    'worklet';

    return {
        x,
        y,
    };
};

export const add = (...vectors: VectorList) => {
    'worklet';

    return {
        x: reduce('add', 'x', vectors),
        y: reduce('add', 'y', vectors),
    };
};

export const sub = (...vectors: VectorList) => {
    'worklet';

    return {
        x: reduce('sub', 'x', vectors),
        y: reduce('sub', 'y', vectors),
    };
};

export const divide = (...vectors: VectorList) => {
    'worklet';

    return {
        x: reduce('divide', 'x', vectors),
        y: reduce('divide', 'y', vectors),
    };
};

export const multiply = (...vectors: VectorList) => {
    'worklet';

    return {
        x: reduce('multiply', 'x', vectors),
        y: reduce('multiply', 'y', vectors),
    };
};

export const invert = <T extends Vector<any>>(vector: T) => {
    'worklet';

    return {
        x: get(vector.x) * -1,
        y: get(vector.y) * -1,
    };
};

export const set = <T extends VectorType>(
    vector: T,
    value: VectorType | SharedValueType | Callback,
) => {
    'worklet';

    // handle animation
    if (typeof value === 'function') {
        vector.x.value = value();
        vector.y.value = value();
        return;
    }

    const x = get(isVector(value) ? value.x : value);
    const y = get(isVector(value) ? value.y : value);

    if (typeof vector.x.value === 'undefined') {
        vector.x = x;
        vector.y = y;
    } else {
        vector.x.value = x;
        vector.y.value = y;
    }
};

export const min = (...vectors: VectorList) => {
    'worklet';

    const getMin = (prop: VectorProp) => {
        return Math.min.apply(
            undefined,
            vectors.map((item) =>
                get(isVector(item) ? item[prop] : item),
            ),
        );
    };

    return {
        x: getMin('x'),
        y: getMin('y'),
    };
};

export const max = (...vectors: VectorList) => {
    'worklet';

    const getMax = (prop: VectorProp) =>
        Math.max.apply(
            undefined,
            vectors.map((item) =>
                get(isVector(item) ? item[prop] : item),
            ),
        );

    return {
        x: getMax('x'),
        y: getMax('y'),
    };
};

export const clamp = <T extends Vector<any>>(
    value: T,
    lowerBound: VectorType | SharedValueType,
    upperBound: VectorType | SharedValueType,
) => {
    'worklet';

    return min(max(lowerBound, value), upperBound);
};

export const eq = <T extends Vector<any>>(
    vector: T,
    value: VectorType | SharedValueType,
) => {
    'worklet';

    const x = get(isVector(value) ? value.x : value);
    const y = get(isVector(value) ? value.y : value);

    return get(vector.x) === x && get(vector.y) === y;
};
