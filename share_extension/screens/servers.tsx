// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from '@react-navigation/native';
import React, {useEffect} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, View} from 'react-native';

import ServersList from '@share/components/servers_list';

type Props = {
    theme: Theme;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

const Servers = ({theme}: Props) => {
    const navigator = useNavigation();
    const intl = useIntl();

    useEffect(() => {
        navigator.setOptions({
            title: intl.formatMessage({id: 'share_extension.servers_screen.title', defaultMessage: 'Select server'}),
        });

    // We only care about changes in the locale
    // navigator should not change in the lifetime of this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [intl.locale]);

    return (
        <View style={styles.container}>
            <ServersList theme={theme}/>
        </View>
    );
};

export default Servers;
