// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-hooks';

import useFieldRefs from './field_refs';

describe('useFieldRefs', () => {
    it('should initialize with empty refs', () => {
        const {result} = renderHook(() => useFieldRefs());
        const [getRef] = result.current;

        expect(getRef('test')).toBeUndefined();
    });

    it('should set and get refs', () => {
        const {result} = renderHook(() => useFieldRefs());
        const [getRef, setRef] = result.current;

        const mockRef = {
            blur: jest.fn(),
            focus: jest.fn(),
            isFocused: jest.fn(),
        };

        act(() => {
            setRef('testField')(mockRef);
        });

        expect(getRef('testField')).toBe(mockRef);
    });

    it('should track number of refs', () => {
        const {result} = renderHook(() => useFieldRefs());
        const [, setRef] = result.current;

        const mockRef1 = {
            blur: jest.fn(),
            focus: jest.fn(),
            isFocused: jest.fn(),
        };

        const mockRef2 = {
            blur: jest.fn(),
            focus: jest.fn(),
            isFocused: jest.fn(),
        };

        act(() => {
            setRef('field1')(mockRef1);
            setRef('field2')(mockRef2);
        });
    });

    it('should remove refs when cleanup function is called', () => {
        const {result} = renderHook(() => useFieldRefs());
        const [getRef, setRef] = result.current;

        const mockRef = {
            blur: jest.fn(),
            focus: jest.fn(),
            isFocused: jest.fn(),
        };

        let cleanup: () => void;
        act(() => {
            cleanup = setRef('testField')(mockRef);
        });

        expect(getRef('testField')).toBe(mockRef);

        act(() => {
            cleanup!();
        });

        expect(getRef('testField')).toBeUndefined();
    });

    it('should handle multiple refs independently', () => {
        const {result} = renderHook(() => useFieldRefs());
        const [getRef, setRef] = result.current;

        const mockRef1 = {
            blur: jest.fn(),
            focus: jest.fn(),
            isFocused: jest.fn(),
        };

        const mockRef2 = {
            blur: jest.fn(),
            focus: jest.fn(),
            isFocused: jest.fn(),
        };

        act(() => {
            setRef('field1')(mockRef1);
            setRef('field2')(mockRef2);
        });

        expect(getRef('field1')).toBe(mockRef1);
        expect(getRef('field2')).toBe(mockRef2);
    });
});
