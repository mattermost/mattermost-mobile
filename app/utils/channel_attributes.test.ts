// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    canMoveToOption,
    compareChannelAttributeFields,
    deriveChannelAttributeBanner,
    getPropertyFieldChangePolicy,
    getPropertyFieldLabel,
    isPropertyFieldRequired,
    isPropertyValueSet,
    resolveChannelAttributes,
    selectAttributesForAction,
    selectChannelInfoAttributes,
    stripUnresolvedTokens,
    type ChannelAttributeField,
    type ChannelAttributeValue,
} from './channel_attributes';

const CLASSIFICATION_OPTIONS = [
    {id: 'level-public', name: 'Public', color: '#00FF00', rank: 1},
    {id: 'level-secret', name: 'Secret', color: '#FF0000', rank: 2},
];

function field(overrides: Partial<ChannelAttributeField> & {id: string; name: string}): ChannelAttributeField {
    return {attrs: {}, ...overrides} as ChannelAttributeField;
}

const classificationField = field({
    id: 'cf-1',
    name: 'classification',
    attrs: {options: CLASSIFICATION_OPTIONS},
});

const classificationValue: ChannelAttributeValue = {fieldId: 'cf-1', value: 'level-secret'} as ChannelAttributeValue;

describe('isPropertyValueSet', () => {
    it('should treat null, undefined, an empty string and an empty list as unset', () => {
        expect(isPropertyValueSet(null)).toBe(false);
        expect(isPropertyValueSet(undefined)).toBe(false);
        expect(isPropertyValueSet('')).toBe(false);
        expect(isPropertyValueSet([])).toBe(false);
    });

    it('should treat a non-empty value as set', () => {
        expect(isPropertyValueSet('level-secret')).toBe(true);
        expect(isPropertyValueSet(['a'])).toBe(true);
    });
});

describe('isPropertyFieldRequired', () => {
    it('should require only on a real boolean true', () => {
        expect(isPropertyFieldRequired(field({id: 'f', name: 'f', attrs: {required: true}}))).toBe(true);
        expect(isPropertyFieldRequired(field({id: 'f', name: 'f', attrs: {required: false}}))).toBe(false);
        expect(isPropertyFieldRequired(field({id: 'f', name: 'f', attrs: {}}))).toBe(false);
    });

    it('should not require on a stringly true, which predates the server-side validation', () => {
        const stringly = {required: 'true'} as unknown as PropertyFieldAttrs;
        expect(isPropertyFieldRequired(field({id: 'f', name: 'f', attrs: stringly}))).toBe(false);
    });
});

describe('getPropertyFieldLabel', () => {
    it('should prefer display_name and fall back to the machine name', () => {
        expect(getPropertyFieldLabel(field({id: 'f', name: 'program', attrs: {display_name: 'Program'}}))).toBe('Program');
        expect(getPropertyFieldLabel(field({id: 'f', name: 'program', attrs: {}}))).toBe('program');
    });
});

describe('getPropertyFieldChangePolicy', () => {
    it('should return the configured policy', () => {
        expect(getPropertyFieldChangePolicy(field({id: 'f', name: 'f', attrs: {change_policy: 'raise_only'}}))).toBe('raise_only');
    });

    it('should read an explicit editable false as never, so fields predating change_policy keep their behaviour', () => {
        expect(getPropertyFieldChangePolicy(field({id: 'f', name: 'f', attrs: {editable: false}}))).toBe('never');
    });

    it('should default to any when the key is absent or unrecognised', () => {
        const unrecognised = {change_policy: 'sideways'} as unknown as PropertyFieldAttrs;
        expect(getPropertyFieldChangePolicy(field({id: 'f', name: 'f', attrs: {}}))).toBe('any');
        expect(getPropertyFieldChangePolicy(field({id: 'f', name: 'f', attrs: unrecognised}))).toBe('any');
    });
});

describe('canMoveToOption', () => {
    const rankField = field({id: 'r', name: 'classification', attrs: {options: CLASSIFICATION_OPTIONS, change_policy: 'raise_only'}});

    it('should allow the first write whatever the policy, so a locked attribute is not stranded unset', () => {
        const locked = field({id: 'r', name: 'c', attrs: {options: CLASSIFICATION_OPTIONS, change_policy: 'never'}});
        expect(canMoveToOption(locked, undefined, 'level-secret')).toBe(true);
    });

    it('should refuse every change once set under never', () => {
        const locked = field({id: 'r', name: 'c', attrs: {options: CLASSIFICATION_OPTIONS, change_policy: 'never'}});
        expect(canMoveToOption(locked, 'level-public', 'level-secret')).toBe(false);
    });

    it('should allow only strictly higher ranks under raise_only', () => {
        expect(canMoveToOption(rankField, 'level-public', 'level-secret')).toBe(true);
        expect(canMoveToOption(rankField, 'level-secret', 'level-public')).toBe(false);
        expect(canMoveToOption(rankField, 'level-secret', 'level-secret')).toBe(false);
    });

    it('should fail closed when a rank cannot be resolved on either side', () => {
        expect(canMoveToOption(rankField, 'gone', 'level-secret')).toBe(false);
        expect(canMoveToOption(rankField, 'level-public', 'gone')).toBe(false);
    });
});

describe('compareChannelAttributeFields', () => {
    it('should order by sort_order first', () => {
        const a = field({id: 'a', name: 'zulu', attrs: {sort_order: 1}});
        const b = field({id: 'b', name: 'alpha', attrs: {sort_order: 2}});
        expect([b, a].sort(compareChannelAttributeFields).map((f) => f.id)).toEqual(['a', 'b']);
    });

    it('should break ties on name, and sort a field with no sort_order last', () => {
        const a = field({id: 'a', name: 'alpha', attrs: {}});
        const b = field({id: 'b', name: 'bravo', attrs: {}});
        const ranked = field({id: 'c', name: 'zulu', attrs: {sort_order: 1}});
        expect([b, a, ranked].sort(compareChannelAttributeFields).map((f) => f.id)).toEqual(['c', 'a', 'b']);
    });
});

describe('resolveChannelAttributes', () => {
    it('should pair each field with this channel value and resolve the option', () => {
        const [resolved] = resolveChannelAttributes([classificationField], [classificationValue]);
        expect(resolved.displayValue).toBe('Secret');
        expect(resolved.option?.color).toBe('#FF0000');
        expect(resolved.rawValue).toBe('level-secret');
    });

    it('should include an unset field with an empty display value', () => {
        const [resolved] = resolveChannelAttributes([classificationField], []);
        expect(resolved.displayValue).toBe('');
        expect(resolved.option).toBeUndefined();
    });

    it('should match values by field id rather than position', () => {
        const program = field({id: 'cf-2', name: 'program', attrs: {options: [{id: 'aurora', name: 'AURORA'}]}});
        const values = [
            {fieldId: 'cf-2', value: 'aurora'},
            classificationValue,
        ] as ChannelAttributeValue[];

        const resolved = resolveChannelAttributes([classificationField, program], values);
        expect(resolved.map((r) => [r.field.name, r.displayValue])).toEqual([
            ['classification', 'Secret'],
            ['program', 'AURORA'],
        ]);
    });

    it('should join a multi-value selection with resolved option names', () => {
        const caveat = field({id: 'cf-3', name: 'caveat', attrs: {options: [{id: 'a', name: 'NOFORN'}, {id: 'b', name: 'ORCON'}]}});
        const value = {fieldId: 'cf-3', value: ['a', 'b']} as unknown as ChannelAttributeValue;
        const [resolved] = resolveChannelAttributes([caveat], [value]);
        expect(resolved.displayValue).toBe('NOFORN, ORCON');
    });

    it('should render the raw value when its option no longer exists, rather than dropping the marking', () => {
        const value = {fieldId: 'cf-1', value: 'level-gone'} as ChannelAttributeValue;
        const [resolved] = resolveChannelAttributes([classificationField], [value]);
        expect(resolved.displayValue).toBe('level-gone');
        expect(resolved.option).toBeUndefined();
    });
});

describe('selectAttributesForAction', () => {
    it('should keep only designated attributes that have a value', () => {
        const designatedSet = field({id: '1', name: 'a', attrs: {options: CLASSIFICATION_OPTIONS, actions: ['display_label_header']}});
        const designatedUnset = field({id: '2', name: 'b', attrs: {options: CLASSIFICATION_OPTIONS, actions: ['display_label_header']}});
        const undesignated = field({id: '3', name: 'c', attrs: {options: CLASSIFICATION_OPTIONS, actions: ['display_label_info']}});

        const values = [
            {fieldId: '1', value: 'level-secret'},
            {fieldId: '3', value: 'level-secret'},
        ] as ChannelAttributeValue[];

        const resolved = resolveChannelAttributes([designatedSet, designatedUnset, undesignated], values);
        expect(selectAttributesForAction(resolved, 'display_label_header').map((a) => a.field.id)).toEqual(['1']);
    });
});

describe('selectChannelInfoAttributes', () => {
    it('should list a required attribute even when unset, and omit an optional unset one', () => {
        const requiredUnset = field({id: '1', name: 'a', attrs: {actions: ['display_label_info'], required: true}});
        const optionalUnset = field({id: '2', name: 'b', attrs: {actions: ['display_label_info']}});

        const resolved = resolveChannelAttributes([requiredUnset, optionalUnset], []);
        expect(selectChannelInfoAttributes(resolved, 'display_label_info').map((a) => a.field.id)).toEqual(['1']);
    });

    it('should omit an attribute that is not designated for the info surface', () => {
        const headerOnly = field({id: '1', name: 'a', attrs: {options: CLASSIFICATION_OPTIONS, actions: ['display_label_header']}});
        const resolved = resolveChannelAttributes([headerOnly], [classificationValue as ChannelAttributeValue]);
        expect(selectChannelInfoAttributes(resolved, 'display_label_info')).toHaveLength(0);
    });
});

describe('stripUnresolvedTokens', () => {
    it('should leave text with no tokens untouched', () => {
        expect(stripUnresolvedTokens('CONTROLLED UNCLASSIFIED: IMPACT LEVEL 5')).toBe('CONTROLLED UNCLASSIFIED: IMPACT LEVEL 5');
    });

    it('should remove an unresolved token and tidy the separator it strands', () => {
        expect(stripUnresolvedTokens('Top Secret · {{program}}')).toBe('Top Secret');
        expect(stripUnresolvedTokens('{{classification}} · Aurora')).toBe('Aurora');
    });

    it('should collapse a run of separators left by a token between two others', () => {
        expect(stripUnresolvedTokens('Top Secret · {{program}} · Aurora')).toBe('Top Secret · Aurora');
    });

    it('should tolerate whitespace inside the token braces', () => {
        expect(stripUnresolvedTokens('{{ classification }} Aurora')).toBe('Aurora');
    });

    it('should not strip a markdown list marker, which is not one of the composer separators', () => {
        expect(stripUnresolvedTokens('- {{classification}} Aurora')).toBe('- Aurora');
    });
});

describe('deriveChannelAttributeBanner', () => {
    const designated = field({
        id: 'cf-9',
        name: 'program',
        attrs: {options: [{id: 'aurora', name: 'AURORA', color: '#112233'}], actions: ['display_banner_top']},
    });
    const designatedValue = {fieldId: 'cf-9', value: 'aurora'} as ChannelAttributeValue;

    it('should render nothing when there are no fields', () => {
        expect(deriveChannelAttributeBanner([], [])).toEqual({hasBanner: false, banner: undefined});
    });

    it('should render nothing when the designated attribute has no value on this channel', () => {
        expect(deriveChannelAttributeBanner([designated], [], undefined, undefined, true).hasBanner).toBe(false);
    });

    it('should select the attribute designated for the banner', () => {
        const result = deriveChannelAttributeBanner([designated], [designatedValue], undefined, undefined, true);
        expect(result.hasBanner).toBe(true);
        expect(result.banner).toEqual({enabled: true, text: '**AURORA**', background_color: '#112233'});
    });

    it('should match the value by field id rather than taking the first value on the channel', () => {
        const values = [classificationValue, designatedValue];
        const result = deriveChannelAttributeBanner([classificationField, designated], values, undefined, undefined, true);
        expect(result.banner?.text).toBe('**AURORA**');
    });

    it('should fall back to a classification field that carries no display configuration', () => {
        const result = deriveChannelAttributeBanner([classificationField], [classificationValue]);
        expect(result.hasBanner).toBe(true);
        expect(result.banner).toEqual({enabled: true, text: '**Secret**', background_color: '#FF0000'});
    });

    it('should stop falling back once an administrator has configured display locations, even an empty set', () => {
        const configured = field({id: 'cf-1', name: 'classification', attrs: {options: CLASSIFICATION_OPTIONS, actions: []}});
        expect(deriveChannelAttributeBanner([configured], [classificationValue]).hasBanner).toBe(false);
    });

    it('should prefer a designated attribute over the classification fallback', () => {
        const result = deriveChannelAttributeBanner([classificationField, designated], [classificationValue, designatedValue], undefined, undefined, true);
        expect(result.banner?.text).toBe('**AURORA**');
    });

    it('should use the channel banner text when it is set', () => {
        const result = deriveChannelAttributeBanner([designated], [designatedValue], 'CONTROLLED UNCLASSIFIED', undefined, true);
        expect(result.banner?.text).toBe('CONTROLLED UNCLASSIFIED');
    });

    it('should strip an unresolved token rather than showing braces to the user', () => {
        const result = deriveChannelAttributeBanner([designated], [designatedValue], '{{program}} · Team', undefined, true);
        expect(result.banner?.text).toBe('Team');
    });

    it('should let the authored colour win for a designated attribute', () => {
        const result = deriveChannelAttributeBanner([designated], [designatedValue], 'Text', '#ABCDEF', true);
        expect(result.banner?.background_color).toBe('#ABCDEF');
    });

    it('should keep the option colour for the classification fallback, whatever banner_info carries', () => {
        const result = deriveChannelAttributeBanner([classificationField], [classificationValue], 'Text', '#ABCDEF');
        expect(result.banner?.background_color).toBe('#FF0000');
    });

    it('should render nothing when the stored option no longer exists', () => {
        const value = {fieldId: 'cf-9', value: 'gone'} as ChannelAttributeValue;
        expect(deriveChannelAttributeBanner([designated], [value], undefined, undefined, true).hasBanner).toBe(false);
    });

    it('should select by sort order when more than one attribute designates a banner', () => {
        const second = field({
            id: 'cf-10',
            name: 'caveat',
            attrs: {options: [{id: 'noforn', name: 'NOFORN', color: '#445566'}], actions: ['display_banner_top'], sort_order: 1},
        });
        const values = [designatedValue, {fieldId: 'cf-10', value: 'noforn'} as ChannelAttributeValue];

        const result = deriveChannelAttributeBanner([designated, second], values, undefined, undefined, true);
        expect(result.banner?.text).toBe('**NOFORN**');
    });

    it('should ignore a non-classification designated attribute while the feature is off', () => {
        // The banner mounts on the classification flag alone, so an attribute
        // configured for a server that has not enabled channel attributes must not
        // take over the channel banner.
        expect(deriveChannelAttributeBanner([designated], [designatedValue]).hasBanner).toBe(false);
    });

    it('should still render classification\'s own banner while the feature is off', () => {
        const result = deriveChannelAttributeBanner([classificationField, designated], [classificationValue, designatedValue]);
        expect(result.hasBanner).toBe(true);
        expect(result.banner?.text).toBe('**Secret**');
    });

    it('should honour classification\'s configured banner action while the feature is off', () => {
        const configured = field({
            id: 'cf-1',
            name: 'classification',
            attrs: {options: CLASSIFICATION_OPTIONS, actions: ['display_banner_top']},
        });

        expect(deriveChannelAttributeBanner([configured], [classificationValue]).hasBanner).toBe(true);
    });
});
