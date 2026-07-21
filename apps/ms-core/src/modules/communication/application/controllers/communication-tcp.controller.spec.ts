import { Logger } from '@nestjs/common';
import { CommunicationTcpController } from './communication-tcp.controller';

describe('CommunicationTcpController', () => {
  let controller: CommunicationTcpController;
  let listEmailsUseCaseMock: any;
  let getEmailDetailUseCaseMock: any;
  let getAttachmentUrlUseCaseMock: any;

  beforeEach(() => {
    listEmailsUseCaseMock = { execute: jest.fn() };
    getEmailDetailUseCaseMock = { execute: jest.fn() };
    getAttachmentUrlUseCaseMock = { execute: jest.fn() };

    controller = new CommunicationTcpController(
      listEmailsUseCaseMock,
      getEmailDetailUseCaseMock,
      getAttachmentUrlUseCaseMock,
    );

    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const metadata = { correlationId: '1', userId: 'anon', timestamp: '1' };

  it('should list emails', async () => {
    listEmailsUseCaseMock.execute.mockResolvedValue({ items: [], total: 0 });
    
    const payload = { data: { page: 1, limit: 10 }, metadata };
    const result = await controller.listEmails(payload);

    expect(result).toEqual({ items: [], total: 0 });
    expect(listEmailsUseCaseMock.execute).toHaveBeenCalledWith({ page: 1, limit: 10, ownerId: 'anon' });
  });

  it('should get email detail', async () => {
    getEmailDetailUseCaseMock.execute.mockResolvedValue({ id: '1' });
    
    const payload = { data: { emailId: '1' }, metadata };
    const result = await controller.getEmailDetail(payload);

    expect(result).toEqual({ id: '1' });
    expect(getEmailDetailUseCaseMock.execute).toHaveBeenCalledWith('1', 'anon');
  });

  it('should get attachment url', async () => {
    getAttachmentUrlUseCaseMock.execute.mockResolvedValue({ url: 'http' });
    
    const payload = { data: { emailId: '1', attachmentId: 'a1' }, metadata };
    const result = await controller.getAttachmentUrl(payload);

    expect(result).toEqual({ url: 'http' });
    expect(getAttachmentUrlUseCaseMock.execute).toHaveBeenCalledWith('1', 'a1', 'anon');
  });
});
