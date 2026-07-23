import { Test, TestingModule } from '@nestjs/testing';
import { ImapConnectionFactory } from './imap-connection.factory';
import { ImapFlow } from 'imapflow';

jest.mock('imapflow', () => ({
  ImapFlow: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(true),
  })),
}));

describe('ImapConnectionFactory', () => {
  let factory: ImapConnectionFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImapConnectionFactory],
    }).compile();

    factory = module.get<ImapConnectionFactory>(ImapConnectionFactory);
  });

  it('debe crear y conectar una instancia ImapFlow', async () => {
    const account = { host: 'test.com', port: 993, email: 'test@test.com', password: '123', tls: true };
    const client = await factory.create(account);

    expect(ImapFlow).toHaveBeenCalledWith({
      host: 'test.com',
      port: 993,
      secure: true,
      auth: { user: 'test@test.com', pass: '123' },
      logger: false,
    });
    expect(client.connect).toHaveBeenCalled();
  });
});
