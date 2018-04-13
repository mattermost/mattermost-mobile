// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
            flexDirection: 'row',
            height: 68,
        },
        iconContainer: {
            width: 42,
            height: 68,
            alignItems: 'center',
            justifyContent: 'center',
            marginHorizontal: 15,
        },
        icon: {
            color: theme.buttonBg,
            fontSize: 25,
        },
        wrapper: {
            flex: 1,
        },
        centerLabel: {
            textAlign: 'center',
            textAlignVertical: 'center',
        },
        labelContainer: {
            flex: 1,
            flexDirection: 'row',
        },
        label: {
            color: theme.centerChannelColor,
            flex: 1,
            fontSize: 17,
            textAlignVertical: 'center',
            includeFontPadding: false,
            paddingRight: 15,
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
        },
        arrowContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingRight: 15,
        },
        destructor: {
            color: theme.errorTextColor,
        },
    };
});
