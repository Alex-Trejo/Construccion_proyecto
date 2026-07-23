module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/app.module.ts',
    '!src/observability/**',
    '!src/config/**',
    '!src/**/*.module.ts',
    '!src/**/infrastructure/persistence/*.orm-entity.ts',
    '!src/**/infrastructure/persistence/*.repository.ts'
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@sgc/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
};
