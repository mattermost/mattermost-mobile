// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import BottomSheetContent from '@screens/bottom_sheet/content';

import PlusMenuItem from './menu_item';

const PlusMenuList = () => {
    return (
        <BottomSheetContent
            showTitle={false}
            showButton={false}
        >
            <View>
                <PlusMenuItem
                    title='Browse Channels'
                    iconName='globe'
                />
            </View>

            <View>
                <PlusMenuItem
                    title='Create New Channel'
                    iconName='plus'
                />
            </View>

            <View>
                <PlusMenuItem
                    title='Open a Direct Message'
                    iconName='account-outline'
                />
            </View>
        </BottomSheetContent>
    );
};

export default PlusMenuList;
