const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./", // Path to the Next.js app
});

const customJestConfig = {
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1", // Support path aliases in TypeScript
  },
};

module.exports = createJestConfig(customJestConfig);
