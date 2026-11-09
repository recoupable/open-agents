import { expect, test } from "bun:test";
import { formatUsd } from "./format-usd";

test.each([
  [0, "$0.0000"],
  [0.0005, "$0.0005"],
  [0.01, "$0.01"],
  [1, "$1.00"],
  [99.99, "$99.99"],
  [100, "$100"],
  [1234.56, "$1,235"],
])("displays %s USD as %s", (amount, expected) => {
  expect(formatUsd(amount)).toBe(expected);
});
