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

  it('should update storage key', () => {
    const attachment = new EmailAttachmentEntity({
      id: 'att-1',
      receivedEmailId: 'email-1',
      filename: 'test.pdf',
      extension: 'pdf',
      contentType: 'application/pdf',
      size: 1024,
      storageBucket: 'bucket',
      storageKey: 'key',
      createdAt: new Date(),
    });

    attachment.updateStorageLocation('new-bucket', 'new-key');

    expect(attachment.storageBucket).toBe('new-bucket');
    expect(attachment.storageKey).toBe('new-key');
  });
});
