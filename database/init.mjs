import { openDatabase } from './open.mjs';

openDatabase().close();
console.log('RIP database schema and migrations are ready.');
