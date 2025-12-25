// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Stack} from 'expo-router';

import {withServerDatabase} from '@database/components';
import {useIsTablet} from '@hooks/device';

function BottomSheetLayout() {
    const isTablet = useIsTablet();

    return (
        <Stack
            screenOptions={{
                presentation: isTablet ? 'formSheet' : 'transparentModal',
                contentStyle: {backgroundColor: 'transparent'},
                gestureEnabled: false,
                animation: 'none',
                headerShown: false,
            }}
        />
    );
}

export default withServerDatabase(BottomSheetLayout);
