// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type ReactNode} from 'react';

type Props = {
    children: ReactNode;
}

const Overlay = ({children}: Props) => {
    return children;
};

export default Overlay;
