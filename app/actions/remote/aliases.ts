// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General} from '@constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getAliasesCollection} from '@queries/servers/aliases';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import type {Collection, Database} from '@nozbe/watermelondb';
import type AliasesModel from '@typings/database/models/servers/aliases';

const deleteExistingAliases = async (
    database: Database,
    dbAliases: Collection<AliasesModel>,
) => {
    const allAliases = await dbAliases.query().fetch();
    await database.batch(
        ...allAliases.map((alias) => alias.prepareDestroyPermanently()),
    );
};

const createNewAliases = async (
    dbAliases: Collection<AliasesModel>,
    aliases: Record<string, string>,
) => {
    await Promise.all(
        Object.entries(aliases).map(([from, to]) =>
            dbAliases.create((record) => {
                record.from = from;
                record.to = to;
            }),
        ),
    );
};

export const fetchAliases = async (serverUrl: string) => {
    try {
        const {database} =
            DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const dbAliases = await getAliasesCollection(database);
        const client = NetworkManager.getClient(serverUrl);
        const manifests = await client.getPluginsManifests();

        if (!manifests.map((v) => v.id).includes(General.ALIASES_PLUGIN_ID)) {
            return {};
        }

        const aliases = await client.getAliases();
        if (!dbAliases) {
            return aliases;
        }

        await database.write(async () => {
            await deleteExistingAliases(database, dbAliases);
            await createNewAliases(dbAliases, aliases);
        });

        return aliases;
    } catch (error) {
        logDebug('error on getting aliases', getFullErrorMessage(error));
        return {};
    }
};
