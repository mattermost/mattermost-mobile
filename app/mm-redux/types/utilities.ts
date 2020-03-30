// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
export type $ID<E extends {id: string}> = E['id'];
export type $UserID<E extends {user_id: string}> = E['user_id'];
export type $Name<E extends {name: string}> = E['name'];
export type $Username<E extends {username: string}> = E['username'];
export type $Email<E extends {email: string}> = E['email'];
export type RelationOneToOne<E extends {id: string}, T> = {
    [x in $ID<E>]: T;
};
export type RelationOneToMany<E1 extends {id: string}, E2 extends {id: string}> = {
    [x in $ID<E1>]: Array<$ID<E2>>;
};
export type IDMappedObjects<E extends {id: string}> = RelationOneToOne<E, E>;
export type UserIDMappedObjects<E extends {user_id: string}> = {
    [x in $UserID<E>]: E;
};
export type NameMappedObjects<E extends {name: string}> = {
    [x in $Name<E>]: E;
};
export type UsernameMappedObjects<E extends {username: string}> = {
    [x in $Username<E>]: E;
};
export type EmailMappedObjects<E extends {email: string}> = {
    [x in $Email<E>]: E;
};

export type Dictionary<T> = {
    [key: string]: T;
};