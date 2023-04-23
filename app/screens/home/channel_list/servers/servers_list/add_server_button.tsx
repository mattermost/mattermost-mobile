// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFooter, type BottomSheetFooterProps} from '@gorhom/bottom-sheet';
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {BottomSheetButton} from '@screens/bottom_sheet';
import {addNewServer} from '@utils/server';

const AddServerButton = (props: BottomSheetFooterProps) => {
    const theme = useTheme();
    const {formatMessage} = useIntl();

    const onAddServer = useCallback(async () => {
        addNewServer(theme);
    }, []);

    return (
        <BottomSheetFooter {...props}>
            <BottomSheetButton
                onPress={onAddServer}
                icon='plus'
                testID='servers.create_button'
                text={formatMessage({id: 'servers.create_button', defaultMessage: 'Add a server'})}
            />
        </BottomSheetFooter>
    );
};

export default AddServerButton;
