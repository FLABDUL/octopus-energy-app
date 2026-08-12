import server from '../server/index.js';

const { createApp } = server;

export const config = { maxDuration: 60 };

export default createApp();
