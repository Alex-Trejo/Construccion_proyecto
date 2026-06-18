import { EmailAttachmentEntity } from './email-attachment.entity';

describe('EmailAttachmentEntity', () => {
  it('should create a valid EmailAttachmentEntity', () => {
    const props = {
      id: 'att-1',
      receivedEmailId: 'email-1',
      filename: 'test.pdf',
      extension: 'pdf',
      contentType: 'application/pdf',
      size: 1024,
      storageBucket: 'bucket',
      storageKey: 'key',
      createdAt: new Date(),
    };

    const attachment = new EmailAttachmentEntity(props);

    expect(attachment.id).toBe('att-1');
    expect(attachment.receivedEmailId).toBe('email-1');
    expect(attachment.filename).toBe('test.pdf');
    expect(attachment.extension).toBe('pdf');
  });

  it('should format size correctly', () => {
    const attachment = new EmailAttachmentEntity({
      id: 'att-1',
      receivedEmailId: 'email-1',
      filename: 'test.pdf',
      extension: 'pdf',
      contentType: 'application/pdf',
      size: 1500,
      storageBucket: 'bucket',
      storageKey: 'key',
      createdAt: new Date(),
    });

    expect(attachment.formattedSize).toBe('1.5 KB');
    expect(attachment.isPdf).toBe(true);
    expect(attachment.isXml).toBe(false);
  });
});
