// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {Database, Model} from '@nozbe/watermelondb';

import {defaultSchema} from '../schema';

import {App, Global, Servers} from '../models';

const {APP, GLOBAL, SERVERS} = MM_TABLES.DEFAULT;

function makeDatabase({actionsEnabled = false} = {}) {
    return new Database({

        // @ts-ignore
        adapter: {schema: defaultSchema},
        modelClasses: [App, Global, Servers],
        actionsEnabled,
    });
}

function genericModelTests(model: Model, tableName: string, database: Database) {
    describe(`=> Testing Model : ${model.constructor.name}`, () => {
        it(`the value of the properties "db" and "database" should be similar for model ${model.constructor.name}`, async () => {
            expect(model.database).toBe(database);

            // @ts-ignore
            expect(model.db).toBe(database);
        });
        it(`the database collection and the model's collection should be similar for model ${model.constructor.name}`, () => {
            expect(model.collections).toBe(database.collections);
            expect(model.collections.get(tableName).modelClass).toBe(model.constructor);
        });
    });
}

describe('*** Testing DEFAULT Models ***', () => {
    const database = makeDatabase();

    // @ts-ignore
    const appModel = new App(database.get(APP), {});

    // @ts-ignore
    const globalModel = new Global(database.get(GLOBAL), {});

    // @ts-ignore
    const serverModel = new Servers(database.get(SERVERS), {});
    genericModelTests(appModel, APP, database);
    genericModelTests(globalModel, GLOBAL, database);
    genericModelTests(serverModel, SERVERS, database);
});
