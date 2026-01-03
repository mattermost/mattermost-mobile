// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Screens} from '@constants';
import BottomSheet from '@screens/bottom_sheet';
import BottomSheetStore from '@store/bottom_sheet_store';

export default function GenericBottomSheetRoute() {
    const {bottom} = useSafeAreaInsets();
    const snapPoints = BottomSheetStore.getSnapPoints();

    const renderContent = BottomSheetStore.getRenderContentCallback();

    if (typeof snapPoints?.[1] === 'number') {
        snapPoints[1] += bottom;
    }

    return (
        <BottomSheet
            screen={Screens.GENERIC_BOTTOM_SHEET}
            renderContent={renderContent!}
            footerComponent={BottomSheetStore.getFooterComponent()}
            snapPoints={snapPoints}
        />
    );
}
