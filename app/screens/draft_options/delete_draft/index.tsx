// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Text} from 'react-native';

import CompassIcon from '@app/components/compass_icon';
import TouchableWithFeedback from '@app/components/touchable_with_feedback';
import {ICON_SIZE} from '@app/constants/post_draft';
import {useTheme} from '@app/context/theme';
import {dismissBottomSheet} from '@app/screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@app/utils/theme';
import {typography} from '@app/utils/typography';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    bottomSheetId: AvailableScreens;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    title: {
        color: theme.centerChannelColor,
        ...typography('Body', 200),
    },
    draftOptions: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingVertical: 12,
    },
}));

const DeleteDraft: React.FC<Props> = ({
    bottomSheetId,
}) => {
    const theme = useTheme();
    const intl = useIntl();
    const style = getStyleSheet(theme);

    const draftDeleteHandler = async () => {
        await dismissBottomSheet(bottomSheetId);
    };

    return (
        <TouchableWithFeedback
            type={'opacity'}
            style={style.draftOptions}
            onPress={draftDeleteHandler}
        >
            <CompassIcon
                name='trash-can-outline'
                size={ICON_SIZE}
                color={changeOpacity(theme.centerChannelColor, 0.56)}
            />
            <Text style={style.title}>{intl.formatMessage({id: 'draft.options.delete.title', defaultMessage: 'Delete'})}</Text>
        </TouchableWithFeedback>
    );
};

export default DeleteDraft;
