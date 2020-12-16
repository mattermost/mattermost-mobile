// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as redux from 'redux';
import {Persistor} from 'redux-persist';

class Store {
    redux: redux.Store | null;
    persistor: Persistor | null;

    constructor() {
        this.redux = null;
        this.persistor = null;
    }
}

export default new Store();
