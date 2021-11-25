// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import keyMirror from '@utils/key_mirror';

export const REDIRECT_URL_SCHEME = 'mmauth://';
export const REDIRECT_URL_SCHEME_DEV = 'mmauthbeta://';

const constants = keyMirror({
    SAML: null,
    GITLAB: null,
    GOOGLE: null,
    OFFICE365: null,
    OPENID: null,
});

export default {
    ...constants,
    REDIRECT_URL_SCHEME,
    REDIRECT_URL_SCHEME_DEV,
};
