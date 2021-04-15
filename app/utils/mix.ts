// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class MixinBuilder {
    superclass: any;
    constructor(superclass: any) {
        this.superclass = superclass;
    }

    with(...mixins: any[]) {
        return mixins.reduce((c, mixin) => mixin(c), this.superclass);
    }
}

const mix = (superclass: any) => new MixinBuilder(superclass);

export default mix;
