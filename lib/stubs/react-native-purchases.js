/**
 * Stub for react-native-purchases when not installed.
 * Metro resolves the package to this file so dynamic import() doesn't fail.
 */
module.exports = {
  default: {
    configure: async () => {},
    getCustomerInfo: async () => ({ customerInfo: { entitlements: { active: {} } } }),
    restorePurchases: async () => ({ customerInfo: { entitlements: { active: {} } } }),
    purchaseStoreProduct: async () => ({ customerInfo: { entitlements: { active: {} } } }),
  },
};
