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

  it('should add an attachment', () => {
    const email = new ReceivedEmail({
      id: 'email-1',
      emailFrom: 'test@test.com',
      emailSubject: 'Test',
      emailDate: new Date(),
      emailMessageId: 'msg-1',
      attachments: [],
      createdAt: new Date(),
    });

    const mockAttachment = { id: 'att-1' } as any;
    email.addAttachment(mockAttachment);

    expect(email.attachments.length).toBe(1);
    expect(email.attachments[0].id).toBe('att-1');
  });
});
