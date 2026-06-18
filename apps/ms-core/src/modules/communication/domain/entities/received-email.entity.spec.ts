import { ReceivedEmail } from './received-email.entity';

describe('ReceivedEmail', () => {
  it('should create a valid ReceivedEmail', () => {
    const props = {
      id: 'email-1',
      emailFrom: 'test@test.com',
      emailSubject: 'Test',
      emailDate: new Date(),
      emailMessageId: 'msg-1',
      attachments: [],
      createdAt: new Date(),
    };

    const email = new ReceivedEmail(props);

    expect(email.id).toBe('email-1');
    expect(email.emailFrom).toBe('test@test.com');
  });

  it('should calculate attachment properties correctly', () => {
    const mockXmlAttachment = { extension: 'xml' } as any;
    const mockPdfAttachment = { extension: 'pdf' } as any;

    const email = new ReceivedEmail({
      id: 'email-1',
      emailFrom: 'test@test.com',
      emailSubject: 'Test',
      emailDate: new Date(),
      emailMessageId: 'msg-1',
      attachments: [mockXmlAttachment, mockPdfAttachment],
      createdAt: new Date(),
    });

    expect(email.attachmentCount).toBe(2);
    expect(email.hasXmlAttachments).toBe(true);
    expect(email.hasPdfAttachments).toBe(true);
  });
});
