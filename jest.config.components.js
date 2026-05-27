/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jest-environment-jsdom",
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node",
          esModuleInterop: true,
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          jsx: "react-jsx",
          paths: {
            "@/*": ["./src/*"],
          },
          baseUrl: ".",
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|scss|sass)$": "<rootDir>/__mocks__/styleMock.js",
    "\\.(jpg|jpeg|png|gif|svg|webp)$": "<rootDir>/__mocks__/fileMock.js",
  },
  setupFilesAfterEnv: ["@testing-library/jest-dom"],
  testMatch: ["**/__tests__/components/**/*.test.tsx"],
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
};

module.exports = config;
