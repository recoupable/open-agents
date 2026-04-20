// Cookie set by @privy-io/react-auth on login with the customer access
// token. We read and verify it server-side via @privy-io/node. Privy's
// SDK also clears it on logout, so no signout route is needed.
export const SESSION_COOKIE_NAME = "privy-token";
