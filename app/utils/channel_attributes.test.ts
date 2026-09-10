// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    attributeTierGate,
    canEditAttributeField,
    canMoveToOption,
    canSetChannelAttributeOnCreate,
    compareChannelAttributeFields,
    deriveChannelAttributeBanner,
    getAttributeEditability,
    getPropertyFieldChangePolicy,
    getPropertyFieldLabel,
    hasAttributeEditor,
    isPropertyFieldRequired,
    reachableOptions,
    isPropertyValueSet,
    pruneStaleAttributeValues,
    resolveChannelAttributes,
    selectAttributesForAction,
    selectChannelInfoAttributes,
    stripUnresolvedTokens,
    type ChannelAttributeField,
    type ChannelAttributePermissions,
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
    const ADMIN_PERMS: ChannelAttributePermissions = {canManageChannelProperties: true, canManageChannelRoles: true, canManageSystem: false};
    const MEMBER_PERMS: ChannelAttributePermissions = {canManageChannelProperties: true, canManageChannelRoles: false, canManageSystem: false};
    const NO_PROPERTIES_PERMS: ChannelAttributePermissions = {canManageChannelProperties: false, canManageChannelRoles: true, canManageSystem: true};

    // Fields with no display configuration (attrs.actions absent or empty) are the
    // key case — they must still appear in Channel Info because it is the only
    // editing surface, even when display_label_info is not set.
    const noDesignation = field({id: '1', name: 'a', attrs: {options: CLASSIFICATION_OPTIONS}});
    const noDesignationValue: ChannelAttributeValue = {fieldId: '1', value: 'level-secret'} as ChannelAttributeValue;

    const requiredAdminTier = field({id: '2', name: 'b', permissionValues: 'admin', attrs: {options: CLASSIFICATION_OPTIONS, required: true}});
    const requiredMemberTier = field({id: '6', name: 'f', permissionValues: 'member', attrs: {options: CLASSIFICATION_OPTIONS, required: true}});
    const optionalNoDesignation = field({id: '3', name: 'c', attrs: {options: CLASSIFICATION_OPTIONS}});

    const infoDesignated = field({id: '4', name: 'd', attrs: {options: CLASSIFICATION_OPTIONS, actions: ['display_label_info']}});
    const headerOnly = field({id: '5', name: 'e', attrs: {options: CLASSIFICATION_OPTIONS, actions: ['display_label_header']}});
    const headerOnlyValue: ChannelAttributeValue = {fieldId: '5', value: 'level-secret'} as ChannelAttributeValue;

    describe('channel admin', () => {
        it('should include an attribute with a stored value regardless of display configuration', () => {
            const resolved = resolveChannelAttributes([noDesignation], [noDesignationValue]);
            expect(selectChannelInfoAttributes(resolved, ADMIN_PERMS).map((a) => a.field.id)).toEqual(['1']);
        });

        it('should include a header-only attribute that has a stored value', () => {
            const resolved = resolveChannelAttributes([headerOnly], [headerOnlyValue]);
            expect(selectChannelInfoAttributes(resolved, ADMIN_PERMS).map((a) => a.field.id)).toEqual(['5']);
        });

        it('should include a required-unset attribute the admin can edit, even with no display designation', () => {
            const resolved = resolveChannelAttributes([requiredAdminTier], []);
            expect(selectChannelInfoAttributes(resolved, ADMIN_PERMS).map((a) => a.field.id)).toEqual(['2']);
        });

        it('should omit a required-unset attribute when the viewer lacks manage_channel_properties, even with manage_channel_roles', () => {
            const resolved = resolveChannelAttributes([requiredAdminTier], []);
            expect(selectChannelInfoAttributes(resolved, NO_PROPERTIES_PERMS)).toHaveLength(0);
        });

        it('should omit an optional attribute with no stored value — reached via Add Attribute', () => {
            const resolved = resolveChannelAttributes([optionalNoDesignation], []);
            expect(selectChannelInfoAttributes(resolved, ADMIN_PERMS)).toHaveLength(0);
        });

        it('should omit an info-designated optional attribute that is unset', () => {
            const resolved = resolveChannelAttributes([infoDesignated], []);
            expect(selectChannelInfoAttributes(resolved, ADMIN_PERMS)).toHaveLength(0);
        });
    });

    describe('regular member', () => {
        it('should include an attribute with a stored value', () => {
            const resolved = resolveChannelAttributes([noDesignation], [noDesignationValue]);
            expect(selectChannelInfoAttributes(resolved, MEMBER_PERMS).map((a) => a.field.id)).toEqual(['1']);
        });

        it('should include a header-only attribute that has a stored value', () => {
            const resolved = resolveChannelAttributes([headerOnly], [headerOnlyValue]);
            expect(selectChannelInfoAttributes(resolved, MEMBER_PERMS).map((a) => a.field.id)).toEqual(['5']);
        });

        it('should omit an admin-tier required-unset attribute — a member cannot edit it', () => {
            const resolved = resolveChannelAttributes([requiredAdminTier], []);
            expect(selectChannelInfoAttributes(resolved, MEMBER_PERMS)).toHaveLength(0);
        });

        it('should include a member-tier required-unset attribute — a member with channel-properties permission can edit it, without manage_channel_roles', () => {
            const resolved = resolveChannelAttributes([requiredMemberTier], []);
            expect(selectChannelInfoAttributes(resolved, MEMBER_PERMS).map((a) => a.field.id)).toEqual(['6']);
        });

        it('should omit an optional unset attribute', () => {
            const resolved = resolveChannelAttributes([optionalNoDesignation], []);
            expect(selectChannelInfoAttributes(resolved, MEMBER_PERMS)).toHaveLength(0);
        });
    });

    it('should test stored rawValue rather than displayValue for set-ness', () => {
        // An option id that no longer resolves still counts as a stored value.
        const staleValue: ChannelAttributeValue = {fieldId: '1', value: 'deleted-option-id'} as ChannelAttributeValue;
        const resolved = resolveChannelAttributes([noDesignation], [staleValue]);

        // displayValue resolves to the raw id (unrecognised), but rawValue is set.
        expect(resolved[0].displayValue).toBe('deleted-option-id');
        expect(selectChannelInfoAttributes(resolved, MEMBER_PERMS).map((a) => a.field.id)).toEqual(['1']);
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

    it('should use the option colour for a designated attribute, authored colour is fallback when option has none', () => {
        const result = deriveChannelAttributeBanner([designated], [designatedValue], 'Text', '#ABCDEF', true);

        // option.color (#112233) wins; #ABCDEF is only the fallback for text-type
        // attributes that have no option colour at all.
        expect(result.banner?.background_color).toBe('#112233');
    });

    it('should fall back to the authored colour when the designated option has no colour', () => {
        const noColor = field({
            id: 'cf-20',
            name: 'label',
            attrs: {options: [{id: 'opt', name: 'LABEL'}], actions: ['display_banner_top']},
        });
        const val = {fieldId: 'cf-20', value: 'opt'} as ChannelAttributeValue;
        const result = deriveChannelAttributeBanner([noColor], [val], 'Text', '#ABCDEF', true);
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

describe('hasAttributeEditor', () => {
    it('should report an editor for the four editable field types', () => {
        for (const type of ['text', 'select', 'multiselect', 'rank']) {
            expect(hasAttributeEditor(field({id: 'f', name: 'f', type} as Partial<ChannelAttributeField> & {id: string; name: string}))).toBe(true);
        }
    });

    it('should report no editor for date and user field types', () => {
        for (const type of ['date', 'user', 'multiuser']) {
            expect(hasAttributeEditor(field({id: 'f', name: 'f', type} as Partial<ChannelAttributeField> & {id: string; name: string}))).toBe(false);
        }
    });
});

describe('reachableOptions', () => {
    const rankField = field({
        id: 'cf-1',
        name: 'classification',
        type: 'rank',
        attrs: {options: CLASSIFICATION_OPTIONS, change_policy: 'raise_only'},
    } as Partial<ChannelAttributeField> & {id: string; name: string});

    it('should return every option when nothing is set, because the first write is exempt', () => {
        expect(reachableOptions(rankField, undefined)).toHaveLength(2);
    });

    it('should narrow to the options a directional policy permits', () => {
        const reachable = reachableOptions(rankField, 'level-public');
        expect(reachable).toHaveLength(1);
        expect(reachable[0].id).toBe('level-secret');
    });

    it('should return nothing when a directional policy has been exhausted', () => {
        expect(reachableOptions(rankField, 'level-secret')).toHaveLength(0);
    });

    it('should return nothing for a field with no options', () => {
        expect(reachableOptions(field({id: 'f', name: 'f', attrs: {}}), 'anything')).toHaveLength(0);
    });
});

describe('attributeTierGate', () => {
    it('should map each recognised tier to what it requires', () => {
        expect(attributeTierGate(field({id: 'f', name: 'f', permissionValues: 'sysadmin'}))).toBe('manage_system');
        expect(attributeTierGate(field({id: 'f', name: 'f', permissionValues: 'admin'}))).toBe('manage_channel_roles');
        expect(attributeTierGate(field({id: 'f', name: 'f', permissionValues: 'member'}))).toBe('channel_only');
        expect(attributeTierGate(field({id: 'f', name: 'f', permissionValues: 'none'}))).toBe('never');
    });

    it('should fail closed on an absent, empty or unrecognised tier, matching the server', () => {
        expect(attributeTierGate(field({id: 'f', name: 'f'}))).toBe('never');
        expect(attributeTierGate(field({id: 'f', name: 'f', permissionValues: null}))).toBe('never');
        expect(attributeTierGate(field({id: 'f', name: 'f', permissionValues: ''}))).toBe('never');
        expect(attributeTierGate(field({id: 'f', name: 'f', permissionValues: 'everyone'}))).toBe('never');
    });
});

describe('canSetChannelAttributeOnCreate', () => {
    it('should permit member and admin tiers regardless of canManageSystem', () => {
        expect(canSetChannelAttributeOnCreate(field({id: 'f', name: 'f', permissionValues: 'member'}), false)).toBe(true);
        expect(canSetChannelAttributeOnCreate(field({id: 'f', name: 'f', permissionValues: 'admin'}), false)).toBe(true);
    });

    it('should gate the sysadmin tier on canManageSystem', () => {
        expect(canSetChannelAttributeOnCreate(field({id: 'f', name: 'f', permissionValues: 'sysadmin'}), false)).toBe(false);
        expect(canSetChannelAttributeOnCreate(field({id: 'f', name: 'f', permissionValues: 'sysadmin'}), true)).toBe(true);
    });

    it('should fail closed on an absent, empty or unrecognised tier, matching the server', () => {
        expect(canSetChannelAttributeOnCreate(field({id: 'f', name: 'f'}), true)).toBe(false);
        expect(canSetChannelAttributeOnCreate(field({id: 'f', name: 'f', permissionValues: 'none'}), true)).toBe(false);
        expect(canSetChannelAttributeOnCreate(field({id: 'f', name: 'f', permissionValues: 'everyone'}), true)).toBe(false);
    });
});

describe('canEditAttributeField', () => {
    const permissions = (overrides: Partial<ChannelAttributePermissions> = {}): ChannelAttributePermissions => ({
        canManageChannelProperties: true,
        canManageChannelRoles: false,
        canManageSystem: false,
        ...overrides,
    });

    it('should refuse without the channel-level permission, whatever the tier says', () => {
        const memberField = field({id: 'f', name: 'f', permissionValues: 'member'});
        expect(canEditAttributeField(memberField, permissions({canManageChannelProperties: false}))).toBe(false);
    });

    it('should allow a member-tier field on the channel permission alone', () => {
        expect(canEditAttributeField(field({id: 'f', name: 'f', permissionValues: 'member'}), permissions())).toBe(true);
    });

    it('should require manage_channel_roles for an admin-tier field', () => {
        const adminField = field({id: 'f', name: 'f', permissionValues: 'admin'});
        expect(canEditAttributeField(adminField, permissions())).toBe(false);
        expect(canEditAttributeField(adminField, permissions({canManageChannelRoles: true}))).toBe(true);
    });

    it('should require manage_system for a sysadmin-tier field', () => {
        const sysadminField = field({id: 'f', name: 'f', permissionValues: 'sysadmin'});
        expect(canEditAttributeField(sysadminField, permissions({canManageChannelRoles: true}))).toBe(false);
        expect(canEditAttributeField(sysadminField, permissions({canManageSystem: true}))).toBe(true);
    });

    it('should refuse a none-tier field to a system admin', () => {
        const noneField = field({id: 'f', name: 'f', permissionValues: 'none'});
        expect(canEditAttributeField(noneField, permissions({canManageChannelRoles: true, canManageSystem: true}))).toBe(false);
    });
});

describe('getAttributeEditability', () => {
    function selectField(overrides: Partial<PropertyFieldAttrs> = {}): ChannelAttributeField {
        return field({
            id: 'cf-1',
            name: 'classification',
            type: 'rank',
            attrs: {options: CLASSIFICATION_OPTIONS, ...overrides},
        } as Partial<ChannelAttributeField> & {id: string; name: string});
    }

    it('should refuse a field type with no editor before anything else', () => {
        const dateField = field({id: 'f', name: 'f', type: 'date'} as Partial<ChannelAttributeField> & {id: string; name: string});
        expect(getAttributeEditability(dateField, undefined, true)).toEqual({editable: false, reason: 'unsupported_type'});
    });

    it('should refuse without permission', () => {
        expect(getAttributeEditability(selectField(), 'level-public', false)).toEqual({editable: false, reason: 'permission'});
    });

    it('should report a policy lock ahead of a permission one, because it explains the row rather than the reader', () => {
        expect(getAttributeEditability(selectField({change_policy: 'never'}), 'level-public', false)).toEqual({editable: false, reason: 'never'});
        expect(getAttributeEditability(selectField({change_policy: 'raise_only'}), 'level-secret', false)).toEqual({editable: false, reason: 'raise_only'});
    });

    it('should report a missing editor ahead of everything, since no policy can make it editable', () => {
        const dateField = field({
            id: 'f',
            name: 'f',
            type: 'date',
            attrs: {options: CLASSIFICATION_OPTIONS, change_policy: 'never'},
        } as Partial<ChannelAttributeField> & {id: string; name: string});
        expect(getAttributeEditability(dateField, 'level-public', false)).toEqual({editable: false, reason: 'unsupported_type'});
    });

    it('should allow the first write even under a never policy, so a required attribute is not stranded', () => {
        expect(getAttributeEditability(selectField({change_policy: 'never'}), undefined, true)).toEqual({editable: true});
        expect(getAttributeEditability(selectField({change_policy: 'never'}), '', true)).toEqual({editable: true});
    });

    it('should lock a set value under a never policy', () => {
        expect(getAttributeEditability(selectField({change_policy: 'never'}), 'level-public', true)).toEqual({editable: false, reason: 'never'});
    });

    it('should lock a set value under editable=false, which reads as never', () => {
        expect(getAttributeEditability(selectField({editable: false}), 'level-public', true)).toEqual({editable: false, reason: 'never'});
    });

    it('should allow a change under an any policy', () => {
        expect(getAttributeEditability(selectField({change_policy: 'any'}), 'level-public', true)).toEqual({editable: true});
    });

    it('should allow a raise_only field that still has somewhere to go', () => {
        expect(getAttributeEditability(selectField({change_policy: 'raise_only'}), 'level-public', true)).toEqual({editable: true});
    });

    it('should report the directional reason, not never, when raise_only is exhausted', () => {
        expect(getAttributeEditability(selectField({change_policy: 'raise_only'}), 'level-secret', true)).toEqual({editable: false, reason: 'raise_only'});
    });

    it('should report the directional reason when lower_only is exhausted', () => {
        expect(getAttributeEditability(selectField({change_policy: 'lower_only'}), 'level-public', true)).toEqual({editable: false, reason: 'lower_only'});
    });

    it('should lock a text field under a directional policy, which has no ranks to compare', () => {
        const textField = field({
            id: 'tf-1',
            name: 'program',
            type: 'text',
            attrs: {change_policy: 'raise_only'},
        } as Partial<ChannelAttributeField> & {id: string; name: string});
        expect(getAttributeEditability(textField, 'Aurora', true)).toEqual({editable: false, reason: 'raise_only'});
    });

    it('should treat a stored option that no longer resolves as set, and refuse to move off it', () => {
        expect(getAttributeEditability(selectField({change_policy: 'raise_only'}), 'level-deleted', true)).toEqual({editable: false, reason: 'raise_only'});
    });
});

describe('pruneStaleAttributeValues', () => {
    const classificationSelectField = field({...classificationField, type: 'select'});

    it('should keep a value whose field and option both still exist', () => {
        const values = {'cf-1': 'level-secret'};
        expect(pruneStaleAttributeValues([classificationSelectField], values)).toEqual(values);
    });

    it('should return the same object reference when nothing changed', () => {
        const values = {'cf-1': 'level-secret'};
        expect(pruneStaleAttributeValues([classificationSelectField], values)).toBe(values);
    });

    it('should drop a value whose field no longer exists', () => {
        const result = pruneStaleAttributeValues([], {'cf-1': 'level-secret'});
        expect(result).toEqual({});
    });

    it('should drop a select value whose option was removed', () => {
        const result = pruneStaleAttributeValues([classificationSelectField], {'cf-1': 'level-deleted'});
        expect(result).toEqual({});
    });

    it('should filter a multiselect value down to the options that still exist', () => {
        const multiField = field({
            id: 'cf-2',
            name: 'tags',
            type: 'multiselect',
            attrs: {options: CLASSIFICATION_OPTIONS},
        });
        const result = pruneStaleAttributeValues([multiField], {'cf-2': ['level-secret', 'level-deleted']});
        expect(result).toEqual({'cf-2': ['level-secret']});
    });

    it('should drop a multiselect value once every option it held has been removed', () => {
        const multiField = field({
            id: 'cf-2',
            name: 'tags',
            type: 'multiselect',
            attrs: {options: CLASSIFICATION_OPTIONS},
        });
        const result = pruneStaleAttributeValues([multiField], {'cf-2': ['level-deleted']});
        expect(result).toEqual({});
    });

    it('should leave a text value untouched: free text has no option list to fall out of', () => {
        const textField = field({
            id: 'tf-1',
            name: 'program',
            type: 'text',
            attrs: {},
        } as Partial<ChannelAttributeField> & {id: string; name: string});
        const values = {'tf-1': 'Aurora'};
        expect(pruneStaleAttributeValues([textField], values)).toBe(values);
    });
});
