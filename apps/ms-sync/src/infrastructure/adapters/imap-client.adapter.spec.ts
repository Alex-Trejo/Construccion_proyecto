import { ImapClientAdapter } from './imap-client.adapter';
import { ImapConnectionFactory } from '../factories/imap-connection.factory';
import { ImapFlow } from 'imapflow';
import * as mailparser from 'mailparser';

jest.mock('mailparser', () => ({
  simpleParser: jest.fn(),
}));

describe('ImapClientAdapter', () => {
  let adapter: ImapClientAdapter;
  let factoryMock: jest.Mocked<ImapConnectionFactory>;
  let clientMock: jest.Mocked<ImapFlow>;
  let lockMock: any;

  const mockAccount = { host: 'test', port: 993, email: 'test@test.com', password: '123', tls: true };

  beforeEach(() => {
    lockMock = { release: jest.fn() };

    clientMock = {
      getMailboxLock: jest.fn().mockResolvedValue(lockMock),
      fetch: jest.fn(),
      download: jest.fn(),
      messageFlagsAdd: jest.fn(),
      logout: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ImapFlow>;

    factoryMock = {
      create: jest.fn().mockResolvedValue(clientMock),
    } as unknown as jest.Mocked<ImapConnectionFactory>;

    adapter = new ImapClientAdapter(factoryMock);
  });

  it('debe retornar vacio si no hay correos unseen', async () => {
    clientMock.fetch.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {} // Vacio
    } as any);

    const result = await adapter.fetchUnseenWithAttachments(mockAccount);

    expect(result).toEqual([]);
    expect(lockMock.release).toHaveBeenCalled();
    expect(clientMock.logout).toHaveBeenCalled();
  });

  it('debe procesar correos y filtrar solo XML/PDF', async () => {
    clientMock.fetch.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        yield { uid: 1 };
        yield { uid: 2 };
      }
    } as any);

    clientMock.download.mockReturnValue({
      content: {
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from('test');
        }
      }
    } as any);

    const mockMail1 = {
      from: { value: [{ address: 'test1@test' }] },
      subject: 'Factura 1',
      date: new Date(),
      messageId: 'mid-1',
      attachments: [
        { filename: 'factura.xml', content: Buffer.from('xml1'), contentType: 'text/xml' },
        { filename: 'logo.png', content: Buffer.from('png'), contentType: 'image/png' },
      ]
    };

    const mockMail2 = {
      from: { value: [{ address: 'test2@test' }] },
      subject: 'Sin adjuntos',
      date: new Date(),
      messageId: 'mid-2',
      attachments: []
    };

    (mailparser.simpleParser as jest.Mock)
      .mockResolvedValueOnce(mockMail1)
      .mockResolvedValueOnce(mockMail2);

    const result = await adapter.fetchUnseenWithAttachments(mockAccount);

    expect(result).toHaveLength(1);
    expect(result[0].metadata.uid).toBe(1);
    expect(result[0].attachments).toHaveLength(1);
    expect(result[0].attachments[0].filename).toBe('factura.xml');

    expect(clientMock.messageFlagsAdd).toHaveBeenCalledWith({ uid: 1 }, ['\\Seen'], { uid: true });
    expect(clientMock.messageFlagsAdd).toHaveBeenCalledTimes(1); // Solo al 1, el 2 no tenia adjuntos validos
    
    expect(lockMock.release).toHaveBeenCalled();
    expect(clientMock.logout).toHaveBeenCalled();
  });

  it('debe manejar errores y asegurar logout', async () => {
    clientMock.getMailboxLock.mockRejectedValue(new Error('Auth failed'));

    await expect(adapter.fetchUnseenWithAttachments(mockAccount)).rejects.toThrow('IMAP sync failed: Auth failed');

    expect(clientMock.logout).toHaveBeenCalled();
  });
});
