// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import {Sso} from '@constants';
import {SSO} from '@constants/screens';
import {LoginOptionsProps} from '@screens/login_options';
import {goToScreen} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';

import SsoOption from './sso_option';

// LoginOptionWithConfigAndLicenseProps
const SsoOptions = ({config, extra, launchType, launchError, license, theme, serverDisplayName, serverUrl}: LoginOptionsProps) => {
    const styles = getStyleSheet(theme);
    const intl = useIntl();
    const displaySSO = preventDoubleTap((ssoType: string) => {
        const screen = SSO;
        const title = intl.formatMessage({id: 'mobile.routes.sso', defaultMessage: 'Single Sign-On'});
        goToScreen(screen, title, {config, extra, launchError, launchType, license, theme, ssoType, serverDisplayName, serverUrl});
    });

    const ssoArray = [Sso.SAML, Sso.OFFICE365, Sso.GOOGLE, Sso.GITLAB];
    const ssoComponents = ssoArray.map((ssoType) => (
        <SsoOption
            key={ssoType.toString()}
            ssoType={ssoType}
            config={config}
            license={license}
            onPress={displaySSO}
            theme={theme}
        />),
    );

    const numComps = ssoComponents.length;
    console.log('<><><><><><><><>');
    console.log('numComps', numComps);
    console.log('<><><><><><><><>');

    // console.log('ssoComponents', ssoComponents);

    // console.log('props.children', props.children);
    return (
        ssoComponents
    );
};

const getStyleSheet = () => ({
    container: {
        flexDirection: 'row',
        marginVertical: 24,
        alignItems: 'center',
    },
    separatorContainer: {
        width: '48%',
        marginRight: 8,
    },
});

export default SsoOptions;

{/* <View style={styles.container}> */}
{/*     <View style={styles.separatorContainer}> */}
{/*         <SsoOption */}
{/*             ssoType={Sso.SAML} */}
{/*             config={config} */}
{/*             license={license} */}
{/*             onPress={displaySSO} */}
{/*             theme={theme} */}
{/*         /> */}
{/*     </View> */}
{/*     <View style={styles.separatorContainer}> */}
{/*         <SsoOption */}
{/*             ssoType={Sso.OFFICE365} */}
{/*             config={config} */}
{/*             license={license} */}
{/*             onPress={displaySSO} */}
{/*             theme={theme} */}
{/*         /> */}
{/*     </View> */}
{/* </View> */}
{/* <SsoOption */}
{/*     ssoType={Sso.GOOGLE} */}
{/*     config={config} */}
{/*     license={license} */}
{/*     onPress={displaySSO} */}
{/*     theme={theme} */}
{/* /> */}
{/* <SsoOption */}
{/*     ssoType={Sso.GITLAB} */}
{/*     config={config} */}
{/*     license={license} */}
{/*     onPress={displaySSO} */}
{/*     theme={theme} */}
{/* /> */}
{/* <SsoOption */}
{/*     ssoType={Sso.OPENID} */}
{/*     config={config} */}
{/*     license={license} */}
{/*     onPress={displaySSO} */}
{/*     theme={theme} */}
{/* /> */}
