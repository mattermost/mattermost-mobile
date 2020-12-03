// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Database} from '@nozbe/watermelondb';
import {MMDatabaseConnection} from '@typings/database';

class DatabaseManager {
    connections: Database[] = []

    createDatabaseConnection = ({adapter, actionsEnabled, modelClasses}: MMDatabaseConnection) => {
        const database = new Database({adapter, actionsEnabled, modelClasses});
        this.connections.push(database);
    }
}

export default new DatabaseManager();
