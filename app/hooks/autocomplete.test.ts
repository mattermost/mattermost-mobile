// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook} from '@testing-library/react-hooks';

import {useAutocompleteDefaultAnimatedValues} from './autocomplete';

describe('useAutocompleteDefaultAnimatedValues', () => {
    it('should initialize with provided values', () => {
        const position = 100;
        const availableSpace = 200;

        const {result} = renderHook(() =>
            useAutocompleteDefaultAnimatedValues(position, availableSpace),
        );

        const [animatedPosition, animatedAvailableSpace] = result.current;
        expect(animatedPosition.value).toBe(position);
        expect(animatedAvailableSpace.value).toBe(availableSpace);
    });

    it('should update values when props change', () => {
        const initialPosition = 100;
        const initialSpace = 200;

        const {result, rerender} = renderHook(
            ({position, space}) => useAutocompleteDefaultAnimatedValues(position, space),
            {
                initialProps: {position: initialPosition, space: initialSpace},
            },
        );

        // Check initial values
        const [animatedPosition, animatedAvailableSpace] = result.current;
        expect(animatedPosition.value).toBe(initialPosition);
        expect(animatedAvailableSpace.value).toBe(initialSpace);

        // Update props
        const newPosition = 150;
        const newSpace = 250;
        rerender({position: newPosition, space: newSpace});

        // Check updated values
        const [updatedPosition, updatedSpace] = result.current;
        expect(updatedPosition.value).toBe(newPosition);
        expect(updatedSpace.value).toBe(newSpace);
    });
});
