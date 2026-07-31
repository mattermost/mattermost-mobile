// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import {useCallback, useEffect} from 'react';
import {defineMessage, useIntl} from 'react-intl';

import Header from '@components/navigation_header/header';
import {useTheme} from '@context/theme';
import {useDefaultHeaderHeight} from '@hooks/header';
import {usePropsFromParams} from '@hooks/props_from_params';
import TableScreen, {type TableScreenProps} from '@screens/table';

const tableMessage = defineMessage({
    id: 'mobile.routes.table',
    defaultMessage: 'Table',
});

export default function TableRoute() {
    const navigation = useNavigation();
    const theme = useTheme();
    const intl = useIntl();
    const defaultHeight = useDefaultHeaderHeight();
    const props = usePropsFromParams<TableScreenProps>();

    const title = intl.formatMessage(tableMessage);

    const handleBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    useEffect(() => {
        navigation.setOptions({
            headerShown: true,
            presentation: 'card',
            header: () => (
                <Header
                    defaultHeight={defaultHeight}
                    hasSearch={false}
                    isLargeTitle={false}
                    heightOffset={0}
                    onBackPress={handleBack}
                    theme={theme}
                    title={title}
                />
            ),
        });
    }, [navigation, defaultHeight, handleBack, theme, title]);

    return (<TableScreen {...props}/>);
}
