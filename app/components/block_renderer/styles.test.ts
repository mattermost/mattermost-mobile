// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {containerGapStyle, isMmContainerSemanticAccent} from './styles';

describe('isMmContainerSemanticAccent', () => {
    it('should identify semantic accent values', () => {
        expect(isMmContainerSemanticAccent('primary')).toBe(true);
        expect(isMmContainerSemanticAccent('good')).toBe(true);
        expect(isMmContainerSemanticAccent('warning')).toBe(true);
        expect(isMmContainerSemanticAccent('danger')).toBe(true);
        expect(isMmContainerSemanticAccent('default')).toBe(true);
    });

    it('should reject custom color strings', () => {
        expect(isMmContainerSemanticAccent('#2d81ff')).toBe(false);
        expect(isMmContainerSemanticAccent('rgba(0,0,0,0.5)')).toBe(false);
    });
});

describe('containerGapStyle', () => {
    it('should map gap tokens to pixel values', () => {
        expect(containerGapStyle('small')).toEqual({gap: 8});
        expect(containerGapStyle('medium')).toEqual({gap: 12});
        expect(containerGapStyle('large')).toEqual({gap: 16});
        expect(containerGapStyle('xlarge')).toEqual({gap: 20});
    });

    it('should return zero gap for none', () => {
        expect(containerGapStyle('none')).toEqual({gap: 0});
    });

    it('should default to medium when gap is omitted or invalid', () => {
        expect(containerGapStyle(undefined)).toEqual({gap: 12});
        expect(containerGapStyle('invalid' as MmContainerBlock['gap'])).toEqual({gap: 12});
    });
});
