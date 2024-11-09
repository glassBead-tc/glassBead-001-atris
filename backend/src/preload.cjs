const mockBlock = {
    timestamp: Math.floor(Date.now() / 1000),
    number: '0x0'
};

module.exports = {
    resolve(specifier, context, nextResolve) {
        return nextResolve(specifier, context);
    },
    
    load(url, context, nextLoad) {
        if (url.includes('web3-eth-ens')) {
            return {
                format: 'module',
                source: `
                    const mockBlock = ${JSON.stringify(mockBlock)};
                    
                    export class ENS {
                        constructor() {
                            this._lastSyncCheck = ${Date.now() / 1000};
                            this.eth = {
                                getBlock: async () => mockBlock,
                                net: {
                                    getId: async () => 1
                                }
                            };
                        }
                        
                        async checkNetwork() {
                            this._lastSyncCheck = ${Date.now() / 1000};
                            return Promise.resolve();
                        }
                        
                        async getResolver() {
                            return {
                                methods: {
                                    addr: () => ({
                                        call: async () => "0x0000000000000000000000000000000000000000"
                                    })
                                }
                            };
                        }
                    }
                `
            };
        }
        return nextLoad(url, context);
    }
}; 