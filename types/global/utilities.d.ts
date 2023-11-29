// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type $ID<E extends {id: string}> = E['id'];
type $UserID<E extends {user_id: string}> = E['user_id'];
type $Name<E extends {name: string}> = E['name'];
type $Username<E extends {username: string}> = E['username'];
type $Email<E extends {email: string}> = E['email'];
type RelationOneToOne<E extends {id: string}, T> = {
    [x in $ID<E>]: T;
};
type RelationOneToMany<E1 extends {id: string}, E2 extends {id: string}> = {
    [x in $ID<E1>]: Array<$ID<E2>>;
};
type IDMappedObjects<E extends {id: string}> = RelationOneToOne<E, E>;
type UserIDMappedObjects<E extends {user_id: string}> = {
    [x in $UserID<E>]: E;
};
type NameMappedObjects<E extends {name: string}> = {
    [x in $Name<E>]: E;
};
type UsernameMappedObjects<E extends {username: string}> = {
    [x in $Username<E>]: E;
};
type EmailMappedObjects<E extends {email: string}> = {
    [x in $Email<E>]: E;
};

type Dictionary<T> = {
    [key: string]: T;
};

type Intersection<T1, T2> = Omit<Omit<T1&T2, keyof(Omit<T1, keyof(T2)>)>, keyof(Omit<T2, keyof(T1)>)>;
