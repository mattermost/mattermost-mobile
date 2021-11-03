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

const values = {
    SAML: {
        defaultMessage: 'SAML',
        id: 'mobile.login_options.saml',
    },
    GITLAB: {
        defaultMessage: 'GitLab',
        imageSrc: require('@assets/images/Icon_Gitlab.png'),
        id: 'mobile.login_options.gitlab',
    },
    GOOGLE: {
        defaultMessage: 'Google',
        imageSrc: require('@assets/images/Icon_Google.png'),
        id: 'mobile.login_options.google',
    },
    OFFICE365: {
        defaultMessage: 'Office 365',
        imageSrc: require('@assets/images/Icon_Office.png'),
        id: 'mobile.login_options.office365',
    },
    OPENID: {
        defaultMessage: 'Open ID',
        id: 'mobile.login_options.openid',
    },
};

export default {
    values,
    constants,
    REDIRECT_URL_SCHEME,
    REDIRECT_URL_SCHEME_DEV,
};
