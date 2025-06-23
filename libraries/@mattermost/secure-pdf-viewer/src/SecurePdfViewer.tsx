// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as React from 'react';

import SecurePdfViewerNativeComponent, {type NativeProps} from './SecurePdfViewerNativeComponent';

const SecurePdfViewer = (props: NativeProps) => {
    return <SecurePdfViewerNativeComponent {...props}/>;
};

export default SecurePdfViewer;
