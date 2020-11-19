import { Model } from '@nozbe/watermelondb';
export default class App extends Model {
    static table: string;
    appId: string;
    buildNumber: string;
    createdAt: Date;
    unreadCount: string;
}
