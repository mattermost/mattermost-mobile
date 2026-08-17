// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Screens} from '@constants';
import {isEdgeToEdge} from '@constants/device';
import {NOT_EDGE_TO_EDGE_BOTTOM_SHEET_MARGIN} from '@constants/view';
import BottomSheet from '@screens/bottom_sheet';
import BottomSheetStore from '@store/bottom_sheet_store';

export default function GenericBottomSheetRoute() {
    const {bottom} = useSafeAreaInsets();
    const snapPoints = BottomSheetStore.getSnapPoints();

    const renderContent = BottomSheetStore.getRenderContentCallback();

    if (typeof snapPoints?.[1] === 'number') {
        snapPoints[1] += (isEdgeToEdge ? bottom : NOT_EDGE_TO_EDGE_BOTTOM_SHEET_MARGIN);
    }

    // BottomSheetStore.reset() clears this callback — logging out and switching servers
    // both do it — and the route can still render afterwards. Passing undefined through
    // crashed the app: "RCTFatalException: Unhandled JS Exception: TypeError: undefined
    // is not a function ... at GenericBottomSheetRoute" (MM-T4675_2, run 31977498176).
    // Nothing to show is not a crash; render nothing.
    if (!renderContent) {
        return null;
    }

    return (
        <BottomSheet
            screen={Screens.GENERIC_BOTTOM_SHEET}
            renderContent={renderContent}
            footerComponent={BottomSheetStore.getFooterComponent()}
            snapPoints={snapPoints}
        />
    );
}
