// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import SearchBar, {SearchProps} from '@components/search';
import {useIsTablet} from '@hooks/device';

import BottomSheetSearch from './bottom_sheet_search';

const PickerHeader = (props: SearchProps) => {
    const isTablet = useIsTablet();

    if (isTablet) {
        return (<SearchBar {...props}/>);
    }

    return (<BottomSheetSearch {...props}/>);
};

export default PickerHeader;
