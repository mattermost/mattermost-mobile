// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Screens} from '@constants';
import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import {showOverlay} from '@screens/navigation';

type ShowSnackBarArgs = {
    barType: keyof typeof SNACK_BAR_TYPE;
    onPress?: () => void;
    location?: typeof Screens[keyof typeof Screens];
    postInputTop?: number;
};
export const showSnackBar = (passProps: ShowSnackBarArgs) => {
    const screen = Screens.SNACK_BAR;
    showOverlay(screen, passProps);
};
