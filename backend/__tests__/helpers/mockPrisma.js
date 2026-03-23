const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  session: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
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
