import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenAiOcrAdapter } from './openai-ocr.adapter';
import OpenAI from 'openai';
import { BadGatewayException } from '@nestjs/common';

jest.mock('openai');

describe('OpenAiOcrAdapter', () => {
  let adapter: OpenAiOcrAdapter;
  let mockOpenAI: jest.Mocked<OpenAI>;

  beforeEach(async () => {
    (OpenAI as unknown as jest.Mock).mockClear();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAiOcrAdapter,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockImplementation((key) => {
              if (key === 'OPENAI_API_KEY') return 'test-key';
              if (key === 'OPENAI_OCR_MODEL') return 'gpt-4-vision-preview';
              return null;
            }),
          },
        },
      ],
    }).compile();

    adapter = module.get<OpenAiOcrAdapter>(OpenAiOcrAdapter);
    mockOpenAI = (OpenAI as unknown as jest.Mock).mock.instances[0] as jest.Mocked<OpenAI>;
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('extractFromImage', () => {
    it('should parse and normalize successful json response', async () => {
      const mockContent = Buffer.from('test');
      const mockResponse = {
        rucEmisor: '1234567890001',
        razonSocialEmisor: 'TEST SA',
        numeroFactura: '001-001-000000001',
        fechaEmision: '2023-01-01',
        subtotal: 100,
        iva: 12,
        total: 112,
        items: [
          { descripcion: 'Item 1', cantidad: 1, precioUnitario: 100, descuento: 0, total: 100 },
        ],
      };

      mockOpenAI.chat = {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: JSON.stringify(mockResponse) } }],
          }),
        },
      } as any;

      const result = await adapter.extractFromImage(mockContent, 'image/jpeg', 'key1');
      
      expect(result.rucEmisor).toBe('1234567890001');
      expect(result.subtotal).toBe(100);
      expect(result.storageKey).toBe('key1');
    });

    it('should fix subtotal if sum of items differs', async () => {
      const mockContent = Buffer.from('test');
      const mockResponse = {
        subtotal: 50, // wrong subtotal from model
        iva: 12,
        total: 112,
        items: [
          { descripcion: 'Item 1', cantidad: 1, precioUnitario: 100, total: 100 },
        ],
      };

      mockOpenAI.chat = {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: JSON.stringify(mockResponse) } }],
          }),
        },
      } as any;

      const result = await adapter.extractFromImage(mockContent, 'image/png', 'key1');
      
      // Should correct subtotal to 100 based on items sum
      expect(result.subtotal).toBe(100);
    });

    it('should throw BadGatewayException if response is not valid JSON', async () => {
      const mockContent = Buffer.from('test');

      mockOpenAI.chat = {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'This is not json' } }],
          }),
        },
      } as any;

      await expect(adapter.extractFromImage(mockContent, 'image/png', 'key1'))
        .rejects
        .toThrow(BadGatewayException);
    });

    it('should handle null/undefined fields safely', async () => {
      const mockContent = Buffer.from('test');
      const mockResponse = {
        subtotal: null,
        items: [{ descripcion: null, total: "10,5" }] // comma instead of dot
      };

      mockOpenAI.chat = {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: JSON.stringify(mockResponse) } }],
          }),
        },
      } as any;

      const result = await adapter.extractFromImage(mockContent, 'image/png', 'key1');
      
      expect(result.rucEmisor).toBe('');
      expect(result.items[0].descripcion).toBe('');
      expect(result.items[0].total).toBe(10.5);
      expect(result.subtotal).toBe(10.5); // corrected to item sum
    });
  });
});
