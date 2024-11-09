// Simple ES module preload that only handles the ENS patch
export async function resolve(specifier, context, nextResolve) {
    if (specifier.includes('web3-eth-ens')) {
        const module = await nextResolve(specifier, context);
        // Patch only what we need for the ENS check
        if (module.ENS) {
            module.ENS.prototype.checkNetwork = async function() {
                this._lastSyncCheck = Date.now() / 1000;
                return Promise.resolve();
            };
        }
        return module;
    }
    return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
    return nextLoad(url, context);
} 