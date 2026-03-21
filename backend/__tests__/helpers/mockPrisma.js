const mockPrisma = {
  userData: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  class: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  attendance: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

module.exports = mockPrisma;
