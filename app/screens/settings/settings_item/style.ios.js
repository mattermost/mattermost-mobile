// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
            flexDirection: 'row',
            height: 45,
        },
        iconContainer: {
            width: 29,
            height: 29,
            backgroundColor: theme.buttonBg,
            borderRadius: 7,
            alignItems: 'center',
            justifyContent: 'center',
            marginHorizontal: 15,
        },
        icon: {
            color: theme.buttonColor,
            fontSize: 18,
            marginTop: 2,
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
            lineHeight: 43,
        },
        arrowContainer: {
            justifyContent: 'center',
            paddingRight: 15,
        },
        arrow: {
            color: changeOpacity(theme.centerChannelColor, 0.25),
            fontSize: 18,
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
        },
        destructor: {
            color: theme.errorTextColor,
        },
    };
});
