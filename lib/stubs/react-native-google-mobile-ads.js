/**
 * Stub for react-native-google-mobile-ads when not installed.
 * Metro resolves the package to this file so require() doesn't fail.
 */
const React = require('react');
const { View } = require('react-native');

const noop = () => {};
const TestIds = { BANNER: 'test-banner', REWARDED: 'test-rewarded' };

function BannerAd() {
  return React.createElement(View, { style: { height: 0 } });
}
function useRewardedAd() {
  return {
    adLoaded: false,
    adShowing: false,
    load: noop,
    show: noop,
    reward: undefined,
  };
}

module.exports = {
  BannerAd,
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER' },
  TestIds,
  useRewardedAd,
};
