import NodeCache from 'node-cache';

// Initialize cache with 5 minutes TTL by default
const cache = new NodeCache({ stdTTL: 300 });

export default cache;
