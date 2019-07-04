// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

// Used to access the Realm Provider
const context = React.createContext('realm');

export default {
    context,
    allowUnsafeWrites: true,
    watchUnsafeWrites: true,
};
