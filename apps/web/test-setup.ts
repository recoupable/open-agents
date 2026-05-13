import { mock } from "bun:test";

// Privy's ESM exports trip bun's module loader at evaluation time. Any
// module under test that statically imports `@privy-io/react-auth` would
// crash the loader before a per-test `mock.module` could take effect, so
// we stub the SDK here in a preload (see `bunfig.toml`) where it runs
// before every test module is evaluated.
mock.module("@privy-io/react-auth", () => ({
  usePrivy: () => ({
    getAccessToken: async () => "test-access-token",
  }),
}));
