// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// import RNBottomSheet from 'react-native-bottom-sheet';
// export default RNBottomSheet;

import {Navigation} from 'react-native-navigation';

export default {
    showBottomSheetWithOptions: (options, callback) => {
        function itemAction(index) {
            Navigation.dismissModal({animationType: 'none'});
            callback(index);
        }

        const items = options.options.splice(0, options.cancelButtonIndex).map((o, index) => ({
            action: () => itemAction(index),
            text: o,
        }));

        Navigation.showModal({
            screen: 'OptionsModal',
            title: '',
            animationType: 'none',
            passProps: {
                title: '',
                items,
            },
            navigatorStyle: {
                navBarHidden: true,
                statusBarHidden: false,
                statusBarHideWithNavBar: false,
                screenBackgroundColor: 'transparent',
                modalPresentationStyle: 'overCurrentContext',
            },
        });
    },
};
