import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
});

const nextConfig = {
  reactStrictMode: true,
};

export default withSerwist(nextConfig);
