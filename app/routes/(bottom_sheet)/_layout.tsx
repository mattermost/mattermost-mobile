// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Stack} from 'expo-router';

import {withServerDatabase} from '@database/components';

function BottomSheetLayout() {
    return (
        <Stack
            screenOptions={{
                presentation: 'transparentModal',
                contentStyle: {backgroundColor: 'transparent'},
                gestureEnabled: false,
                animation: 'none',
                headerShown: false,
            }}
        />
    );
}

export default withServerDatabase(BottomSheetLayout);
