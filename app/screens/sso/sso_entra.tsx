// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import AuthError from './components/auth_error';
import AuthRedirect from './components/auth_redirect';
import AuthSuccess from './components/auth_success';

interface SSOAuthenticationProps {
    doEntraLogin: () => Promise<boolean>;
    setLoginError: React.Dispatch<React.SetStateAction<string>>;
    loginError: string;
    theme: Theme;
}

const style = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 24,
    },
});

const SSOEntra = ({doEntraLogin, loginError, setLoginError, theme}: SSOAuthenticationProps) => {
    const [loginSuccess, setLoginSuccess] = useState(false);

    const init = useCallback(async () => {
        setLoginSuccess(false);
        setLoginError('');
        const result = await doEntraLogin();
        setLoginSuccess(result);
    }, [doEntraLogin, setLoginError]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            init();
        }, 1000);

        return () => clearTimeout(timeout);
    }, [init]);

    let content;
    if (loginSuccess) {
        content = (<AuthSuccess theme={theme}/>);
    } else if (loginError) {
        content = (
            <AuthError
                error={loginError}
                retry={init}
                theme={theme}
            />
        );
    } else {
        content = (<AuthRedirect theme={theme}/>);
    }

    return (
        <View
            style={style.container}
            testID='sso.redirect_url'
        >
            {content}
        </View>
    );
};

export default SSOEntra;
