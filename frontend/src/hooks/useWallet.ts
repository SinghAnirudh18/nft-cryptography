// MOCK WALLET HOOK - REPLACED TO FIX WHITE SCREEN
export const useWallet = () => {
    return {
        address: null,
        isConnected: false,
        getSigner: async () => null
    };
};
