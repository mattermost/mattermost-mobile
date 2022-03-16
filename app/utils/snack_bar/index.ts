// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Screens, SnackBar} from '@constants';
import {showOverlay} from '@screens/navigation';

const {SNACK_BAR_TYPE} = SnackBar;

export const showSnackBar = (
    barType: keyof typeof SNACK_BAR_TYPE,
    onPress?: () => void,
) => {
    const screen = Screens.SNACK_BAR;
    const passProps = {
        barType,
        onPress,
    };
    showOverlay(screen, passProps);
};
