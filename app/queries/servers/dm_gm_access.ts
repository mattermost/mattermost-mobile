// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';
import {isEqual} from 'lodash';
import {combineLatest, of as of$, type Observable} from 'rxjs';
import {distinctUntilChanged, map, shareReplay, switchMap} from 'rxjs/operators';

import {General} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {getDirectChannelName} from '@utils/channel';

import {isChannelAccessEnforced, observeChannelAccessEnforced} from './render_permissions';
import {observeCurrentUserId, querySystemValue} from './system';

import type ChannelModel from '@typings/database/models/servers/channel';

const {SERVER: {CHANNEL}} = MM_TABLES;

/**
 * The session's decisions for the direct and group message actions. They are the same for every
 * conversation, so they are stored once per server rather than per channel.
 */
export type DmGmAccess = {
    start: boolean;
    read: boolean;
    write: boolean;
};

export const DM_GM_ACCESS_ALLOWED: DmGmAccess = {start: true, read: true, write: true};

/**
 * A missing or malformed record allows everything, and a field is denied only when it is stored as
 * false, so nothing is hidden on a value this version of the app cannot read.
 */
export const parseDmGmAccess = (value: unknown): DmGmAccess => {
    if (!value || typeof value !== 'object') {
        return DM_GM_ACCESS_ALLOWED;
    }
    const {start, read, write} = value as Partial<Record<keyof DmGmAccess, unknown>>;
    return {start: start !== false, read: read !== false, write: write !== false};
};

/**
 * The stored decisions, whether or not the policies are enforced.
 */
export const getDmGmAccessRecord = async (database: Database): Promise<DmGmAccess> => {
    const records = await querySystemValue(database, SYSTEM_IDENTIFIERS.DM_GM_ACCESS).fetch();
    return parseDmGmAccess(records[0]?.value);
};

/**
 * The decisions in effect: everything is allowed while the policies are not enforced.
 */
export const getDmGmAccess = async (database: Database): Promise<DmGmAccess> => {
    const [enforced, access] = await Promise.all([isChannelAccessEnforced(database), getDmGmAccessRecord(database)]);
    return enforced ? access : DM_GM_ACCESS_ALLOWED;
};

// Shared per database like observeRedactionEnforced: every direct or group message row reads it.
const accessStreams = new WeakMap<Database, Observable<DmGmAccess>>();

export const observeDmGmAccess = (database: Database): Observable<DmGmAccess> => {
    const existing = accessStreams.get(database);
    if (existing) {
        return existing;
    }

    const stream = combineLatest([
        observeChannelAccessEnforced(database),
        querySystemValue(database, SYSTEM_IDENTIFIERS.DM_GM_ACCESS).observe().pipe(
            switchMap((result) => (result.length ? result[0].observe() : of$(undefined))),
            map((record) => parseDmGmAccess(record?.value)),
        ),
    ]).pipe(
        map(([enforced, access]) => (enforced ? access : DM_GM_ACCESS_ALLOWED)),
        distinctUntilChanged(isEqual),
        shareReplay({bufferSize: 1, refCount: true}),
    );
    accessStreams.set(database, stream);
    return stream;
};

export const observeCanReadDmGm = (database: Database): Observable<boolean> => {
    return observeDmGmAccess(database).pipe(
        map((access) => access.read),
        distinctUntilChanged(),
    );
};

export const observeCanWriteDmGm = (database: Database): Observable<boolean> => {
    return observeDmGmAccess(database).pipe(
        map((access) => access.write),
        distinctUntilChanged(),
    );
};

/**
 * Sharing into a conversation needs both reading and writing it.
 */
export const observeCanShareToDmGm = (database: Database): Observable<boolean> => {
    return observeDmGmAccess(database).pipe(
        map((access) => access.read && access.write),
        distinctUntilChanged(),
    );
};

/**
 * Starting a conversation is only offered when it could also be read once started.
 */
export const observeCanStartDmGm = (database: Database): Observable<boolean> => {
    return observeDmGmAccess(database).pipe(
        map((access) => access.start && access.read),
        distinctUntilChanged(),
    );
};

/**
 * Whether a direct message with the user may be opened: reopening an existing one needs only Read,
 * creating one needs Start as well.
 */
export const observeCanSendDirectMessageTo = (database: Database, userId: string): Observable<boolean> => {
    return combineLatest([observeDmGmAccess(database), observeHasDirectChannelWith(database, userId)]).pipe(
        map(([access, hasDirectChannel]) => access.read && (access.start || hasDirectChannel)),
        distinctUntilChanged(),
    );
};

/**
 * Whether a direct message with the user is stored, which opening it again needs no Start for.
 */
export const observeHasDirectChannelWith = (database: Database, userId: string): Observable<boolean> => {
    return observeCurrentUserId(database).pipe(
        switchMap((currentUserId) => database.get<ChannelModel>(CHANNEL).query(
            Q.where('name', getDirectChannelName(currentUserId, userId)),
            Q.where('type', General.DM_CHANNEL),
        ).observeCount(false)),
        map((count) => count > 0),
        distinctUntilChanged(),
    );
};
