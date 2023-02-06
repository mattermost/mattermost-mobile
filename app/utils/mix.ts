// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class MixinBuilder<T> {
    superclass: T;
    constructor(superclass: T) {
        this.superclass = superclass;
    }

    with(...mixins: any[]): T {
        return mixins.reduce((c, mixin) => mixin(c), this.superclass);
    }
}

const mix = <T>(superclass: T) => new MixinBuilder(superclass);

export default mix;
