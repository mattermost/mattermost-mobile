import { Model } from '@nozbe/watermelondb';
export default class Server extends Model {
    static table: string;
    dbPath: string;
    displayName: string;
    mentionCount: number;
    unreadCount: number;
    url: string;
}
