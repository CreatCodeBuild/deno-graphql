import {Transport} from './RemoteType';
const fetch = require('node-fetch');

export function HTTP(url: string, headers?: any, credentials?: string): Transport {
    return {
        do: async (remoteQuery: string) => {
            const res = await fetch(url, {
                method: 'POST',
                credentials: credentials,
                headers: {
                    'content-type': 'application/json',
                    ...headers
                },
                body: JSON.stringify({
                    query: remoteQuery
                })
            });
            let body = await res.text();
            try {
                body = JSON.parse(body);
            } catch (e) {
                throw new Error(body);
            }
            if (body.errors) {
                throw new Error(JSON.stringify(body.errors));
            }
            return body;
        }
    }
}
