// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import {Sso} from '@constants';
import {SSO} from '@constants/screens';
import {LoginOptionsProps} from '@screens/login_options';
import {goToScreen} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';

import SsoOption from './sso_option';

// LoginOptionWithConfigAndLicenseProps
const SsoOptions = ({config, extra, launchType, launchError, license, theme, serverDisplayName, serverUrl}: LoginOptionsProps) => {
    const intl = useIntl();
    const displaySSO = preventDoubleTap((ssoType: string) => {
        const screen = SSO;
        const title = intl.formatMessage({id: 'mobile.routes.sso', defaultMessage: 'Single Sign-On'});
        goToScreen(screen, title, {config, extra, launchError, launchType, license, theme, ssoType, serverDisplayName, serverUrl});
    });

    return (
        <>
            <SsoOption
                ssoType={Sso.SAML}
                config={config}
                license={license}
                onPress={displaySSO}
                theme={theme}
            />
            <SsoOption
                ssoType={Sso.OFFICE365}
                config={config}
                license={license}
                onPress={displaySSO}
                theme={theme}
            />
            <SsoOption
                ssoType={Sso.GOOGLE}
                config={config}
                license={license}
                onPress={displaySSO}
                theme={theme}
            />
            <SsoOption
                ssoType={Sso.GITLAB}
                config={config}
                license={license}
                onPress={displaySSO}
                theme={theme}
            />
            <SsoOption
                ssoType={Sso.OPENID}
                config={config}
                license={license}
                onPress={displaySSO}
                theme={theme}
            />
        </>
    );
};

export default SsoOptions;
