// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {deriveClassificationBannerState} from './classification';

import type {PropertyFieldModel, PropertyValueModel} from '@database/models/server';

type ClassificationField = Pick<PropertyFieldModel, 'id' | 'name' | 'objectType' | 'attrs'>;
type ClassificationValue = Pick<PropertyValueModel, 'fieldId' | 'value'>;

const systemField: ClassificationField = {
    id: 'sys-1',
    name: 'classification',
    objectType: 'system',
    attrs: {
        actions: ['display_banner_top'],
        options: [
            {id: 'opt-ts', name: 'TOP SECRET', color: '#FCE83A'},
            {id: 'opt-s', name: 'SECRET', color: '#FF0000'},
        ],
    },
};

const systemValue: ClassificationValue = {fieldId: 'sys-1', value: 'opt-ts'};

describe('deriveClassificationBannerState', () => {
    it('should return hidden state when there are no fields', () => {
        const result = deriveClassificationBannerState([], [systemValue]);
        expect(result).toEqual({visible: false, levelName: '', color: ''});
    });

    it('should return hidden state when the system field is absent', () => {
        const channelOnly: ClassificationField = {...systemField, name: 'classification', objectType: 'channel'};
        const result = deriveClassificationBannerState([channelOnly], [systemValue]);
        expect(result).toEqual({visible: false, levelName: '', color: ''});
    });

    it('should return hidden state when DISPLAY_BANNER_TOP action is missing', () => {
        const noActionField: ClassificationField = {...systemField, attrs: {...systemField.attrs, actions: []}};
        const result = deriveClassificationBannerState([noActionField], [systemValue]);
        expect(result).toEqual({visible: false, levelName: '', color: ''});
    });

    it('should return hidden state when no system value is set', () => {
        const result = deriveClassificationBannerState([systemField], []);
        expect(result).toEqual({visible: false, levelName: '', color: ''});
    });

    it('should return visible state with correct level on happy path', () => {
        const result = deriveClassificationBannerState([systemField], [systemValue]);
        expect(result).toEqual({
            visible: true,
            levelName: 'TOP SECRET',
            color: '#FCE83A',
        });
    });

    it('should return hidden state when option id does not match any option', () => {
        const badValue: ClassificationValue = {...systemValue, value: 'non-existent-opt'};
        const result = deriveClassificationBannerState([systemField], [badValue]);
        expect(result).toEqual({visible: false, levelName: '', color: ''});
    });
});
