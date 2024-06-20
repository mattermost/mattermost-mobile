// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import mix from './mix';

describe('MixinBuilder', () => {
    class BaseClass {
        baseMethod() {
            return 'base method';
        }
    }

    const MixinA = (superclass: any) => class extends superclass {
        mixinAMethod() {
            return 'mixin A method';
        }
    };

    const MixinB = (superclass: any) => class extends superclass {
        mixinBMethod() {
            return 'mixin B method';
        }
    };

    test('applies mixins correctly', () => {
        const MixedClass = mix(BaseClass).with(MixinA, MixinB);
        const instance = new MixedClass();

        expect(instance.baseMethod()).toBe('base method');

        // @ts-expect-error mixin method not defined
        expect(instance.mixinAMethod()).toBe('mixin A method');

        // @ts-expect-error mixin method not defined
        expect(instance.mixinBMethod()).toBe('mixin B method');
    });

    test('applies a single mixin correctly', () => {
        const MixedClass = mix(BaseClass).with(MixinA);
        const instance = new MixedClass();

        expect(instance.baseMethod()).toBe('base method');

        // @ts-expect-error mixin method not defined
        expect(instance.mixinAMethod()).toBe('mixin A method');

        // @ts-expect-error mixin method not defined
        expect(() => instance.mixinBMethod()).toThrow(TypeError);
    });

    test('returns the superclass if no mixins are provided', () => {
        const MixedClass = mix(BaseClass).with();
        const instance = new MixedClass();

        expect(instance.baseMethod()).toBe('base method');

        // @ts-expect-error mixin method not defined
        expect(() => instance.mixinAMethod()).toThrow(TypeError);

        // @ts-expect-error mixin method not defined
        expect(() => instance.mixinBMethod()).toThrow(TypeError);
    });
});
